/**
 * Utility functions for handling Prisma database errors gracefully
 */

export interface PrismaErrorInfo {
  code?: string;
  message: string;
  meta?: any;
  isPrismaError: boolean;
  isSchemaMismatch: boolean;
  userFriendlyMessage: string;
}

/**
 * Analyzes an error and extracts Prisma-specific information
 */
export function analyzePrismaError(error: unknown): PrismaErrorInfo {
  const prismaError = error as any;
  const isPrismaError = !!prismaError?.code?.startsWith('P');
  
  // Check for schema mismatch (column doesn't exist)
  const isSchemaMismatch = 
    isPrismaError && (
      prismaError.message?.includes('does not exist') ||
      prismaError.message?.includes('column') ||
      prismaError.code === 'P2021' || // Table does not exist
      prismaError.code === 'P2022'    // Column does not exist (though this might not be exact)
    );

  let userFriendlyMessage = "An unexpected error occurred. Please try again.";

  if (isPrismaError) {
    switch (prismaError.code) {
      case 'P2002':
        userFriendlyMessage = "A record with this information already exists. Please try again.";
        break;
      case 'P2003':
        userFriendlyMessage = "Referenced record not found. Please check your data and try again.";
        break;
      case 'P2021':
        userFriendlyMessage = "Database table not found. Please contact support.";
        break;
      case 'P2022':
        userFriendlyMessage = "Database schema mismatch. Please contact support.";
        break;
      case 'P1001':
      case 'P1002':
      case 'P1003':
        userFriendlyMessage = "Unable to connect to database. Please try again later.";
        break;
      default:
        if (isSchemaMismatch) {
          userFriendlyMessage = "Database schema mismatch detected. Migration may need to be applied. Please contact support.";
        } else {
          userFriendlyMessage = process.env.NODE_ENV === "development"
            ? `Database error: ${prismaError.message || "Unknown error"} (Code: ${prismaError.code})`
            : "Database error. Please try again or contact support if the issue persists.";
        }
    }
  } else if (error instanceof Error) {
    userFriendlyMessage = process.env.NODE_ENV === "development"
      ? error.message
      : "An error occurred. Please try again.";
  }

  return {
    code: prismaError?.code,
    message: prismaError?.message || (error instanceof Error ? error.message : String(error)),
    meta: prismaError?.meta,
    isPrismaError,
    isSchemaMismatch,
    userFriendlyMessage,
  };
}

/**
 * Logs a Prisma error with full context for debugging
 */
export function logPrismaError(context: string, error: unknown): void {
  const errorInfo = analyzePrismaError(error);
  
  console.error(`[${context}] Database error:`, {
    code: errorInfo.code,
    message: errorInfo.message,
    meta: errorInfo.meta,
    isSchemaMismatch: errorInfo.isSchemaMismatch,
  });
}

