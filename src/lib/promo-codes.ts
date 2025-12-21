import { prisma } from "./prisma";

export interface ValidatePromoCodeParams {
  code: string;
  amount: number; // Amount in paise
  type: "visa" | "tour";
  userId: string;
  applicationId?: string;
  bookingId?: string;
  visaId?: string;
  countryId?: string;
  tourId?: string;
  userEmail?: string;
}

export interface ValidatePromoCodeResult {
  valid: boolean;
  discountAmount?: number; // Discount in paise
  finalAmount?: number; // Final amount after discount in paise
  promoCode?: {
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
  };
  message?: string;
  error?: string;
}

/**
 * Validate and calculate discount for a promo code
 */
export async function validatePromoCode(
  params: ValidatePromoCodeParams
): Promise<ValidatePromoCodeResult> {
  const {
    code,
    amount,
    type,
    userId,
    applicationId,
    bookingId,
    visaId,
    countryId,
    tourId,
    userEmail,
  } = params;

  try {
    // 1. Find promo code
    const promoCode = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    if (!promoCode) {
      return {
        valid: false,
        error: "Invalid promo code",
      };
    }

    // 2. Check if active
    if (!promoCode.isActive) {
      return {
        valid: false,
        error: "This promo code is not active",
      };
    }

    // 3. Check validity period
    const now = new Date();
    if (now < promoCode.validFrom) {
      return {
        valid: false,
        error: "This promo code is not yet valid",
      };
    }

    if (now > promoCode.validUntil) {
      return {
        valid: false,
        error: "This promo code has expired",
      };
    }

    // 4. Check usage limits
    if (promoCode.maxUses !== null && promoCode.currentUses >= promoCode.maxUses) {
      return {
        valid: false,
        error: "This promo code has reached its usage limit",
      };
    }

    // 5. Check user usage limit
    const userUsageCount = await prisma.promoCodeUsage.count({
      where: {
        promoCodeId: promoCode.id,
        userId: userId,
      },
    });

    if (userUsageCount >= promoCode.maxUsesPerUser) {
      return {
        valid: false,
        error: "You have already used this promo code the maximum number of times",
      };
    }

    // 6. Check applicable to type
    if (
      promoCode.applicableTo !== "BOTH" &&
      ((type === "visa" && promoCode.applicableTo !== "VISAS") ||
        (type === "tour" && promoCode.applicableTo !== "TOURS"))
    ) {
      return {
        valid: false,
        error: "This promo code is not applicable to this type of booking",
      };
    }

    // 7. Check visa/tour/country restrictions
    if (type === "visa") {
      if (promoCode.visaIds.length > 0 && visaId && !promoCode.visaIds.includes(visaId)) {
        return {
          valid: false,
          error: "This promo code is not applicable to this visa",
        };
      }

      if (
        promoCode.countryIds.length > 0 &&
        countryId &&
        !promoCode.countryIds.includes(countryId)
      ) {
        return {
          valid: false,
          error: "This promo code is not applicable to this country",
        };
      }
    } else if (type === "tour") {
      if (promoCode.tourIds.length > 0 && tourId && !promoCode.tourIds.includes(tourId)) {
        return {
          valid: false,
          error: "This promo code is not applicable to this tour",
        };
      }
    }

    // 8. Check minimum purchase amount
    if (promoCode.minPurchaseAmount && amount < promoCode.minPurchaseAmount) {
      return {
        valid: false,
        error: `Minimum purchase amount of ₹${promoCode.minPurchaseAmount / 100} required`,
      };
    }

    // 9. Check user restrictions (whitelist: if restrictedUserIds is set, only those users can use)
    if (promoCode.restrictedUserIds.length > 0 && !promoCode.restrictedUserIds.includes(userId)) {
      return {
        valid: false,
        error: "This promo code is not available for your account",
      };
    }

    // Check email restrictions (whitelist: if restrictedEmails is set, only those emails can use)
    if (
      promoCode.restrictedEmails.length > 0 &&
      userEmail &&
      !promoCode.restrictedEmails.includes(userEmail.toLowerCase())
    ) {
      return {
        valid: false,
        error: "This promo code is not available for your email address",
      };
    }

    // 10. Check if new user only
    if (promoCode.newUsersOnly) {
      const userApplications = await prisma.application.count({
        where: { userId: userId },
      });
      const userBookings = await prisma.booking.count({
        where: { userId: userId },
      });

      if (userApplications > 0 || userBookings > 0) {
        return {
          valid: false,
          error: "This promo code is only available for new users",
        };
      }
    }

    // 11. Calculate discount
    let discountAmount = 0;
    let finalAmount = amount;

    switch (promoCode.discountType) {
      case "PERCENTAGE":
        discountAmount = Math.floor((amount * promoCode.discountValue) / 100);
        // Apply max discount cap if set
        if (
          promoCode.maxDiscountAmount &&
          discountAmount > promoCode.maxDiscountAmount
        ) {
          discountAmount = promoCode.maxDiscountAmount;
        }
        finalAmount = Math.max(0, amount - discountAmount);
        break;

      case "FIXED_AMOUNT":
        discountAmount = promoCode.discountValue;
        // Don't discount more than the order amount
        if (discountAmount > amount) {
          discountAmount = amount;
        }
        finalAmount = Math.max(0, amount - discountAmount);
        break;

      case "FREE":
        // Set to minimum amount (usually 0 or processing fee)
        discountAmount = amount;
        finalAmount = 0;
        break;

      default:
        return {
          valid: false,
          error: "Invalid discount type",
        };
    }

    return {
      valid: true,
      discountAmount,
      finalAmount,
      promoCode: {
        id: promoCode.id,
        code: promoCode.code,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
      },
      message: getDiscountMessage(promoCode, discountAmount),
    };
  } catch (error) {
    console.error("Error validating promo code:", error);
    return {
      valid: false,
      error: "An error occurred while validating the promo code",
    };
  }
}

/**
 * Record promo code usage
 */
export async function recordPromoCodeUsage(params: {
  promoCodeId: string;
  userId: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  applicationId?: string;
  bookingId?: string;
  paymentId?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Create usage record
      const usage = await tx.promoCodeUsage.create({
        data: {
          promoCodeId: params.promoCodeId,
          userId: params.userId,
          applicationId: params.applicationId || null,
          bookingId: params.bookingId || null,
          paymentId: params.paymentId || null,
          originalAmount: params.originalAmount,
          discountAmount: params.discountAmount,
          finalAmount: params.finalAmount,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });

      // Increment usage count
      await tx.promoCode.update({
        where: { id: params.promoCodeId },
        data: {
          currentUses: {
            increment: 1,
          },
        },
      });

      return usage;
    });

    return result;
  } catch (error) {
    console.error("Error recording promo code usage:", error);
    throw error;
  }
}

/**
 * Get discount message for display
 */
function getDiscountMessage(promoCode: any, discountAmount: number): string {
  const discountRupees = discountAmount / 100;

  switch (promoCode.discountType) {
    case "PERCENTAGE":
      return `${promoCode.discountValue}% off - Save ₹${discountRupees.toFixed(2)}`;
    case "FIXED_AMOUNT":
      return `₹${discountRupees.toFixed(2)} off applied`;
    case "FREE":
      return "Free booking - Promo code applied";
    default:
      return "Discount applied";
  }
}
