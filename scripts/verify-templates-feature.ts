/**
 * Verification Script for Document Templates Feature
 * 
 * Verifies:
 * 1. Database connection and schema (DocumentTemplate table).
 * 2. MinIO S3 connectivity (upload and signed URL generation).
 * 
 * Run with: npx tsx scripts/verify-templates-feature.ts
 */

import { PrismaClient } from "@prisma/client";
import { uploadVisaDocument, getSignedDocumentUrl } from "../src/lib/minio";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
    console.log("🔍 Verifying Download Templates Feature...\n");

    // 1. Database Check
    try {
        console.log("1️⃣  Checking Database Schema...");
        // Check if we can query DocumentTemplate table
        const count = await prisma.documentTemplate.count();
        console.log(`   ✓ Connected to database successfully.`);
        console.log(`   ✓ Found ${count} existing document templates.`);

        // Check for country relation
        const countries = await prisma.country.findMany({ take: 1 });
        if (countries.length > 0) {
            console.log(`   ✓ Country table accessible (Sample: ${countries[0].name})`);
        } else {
            console.log(`   ⚠ No countries found to test relation.`);
        }

    } catch (error: any) {
        console.error(`   ❌ Database verification failed: ${error.message}`);
        process.exit(1);
    }

    // 2. MinIO S3 Check
    try {
        console.log("\n2️⃣  Checking MinIO Connectivity...");

        // Create a dummy file for testing
        const testFileName = `test-template-${Date.now()}.txt`;
        const fileContent = "This is a test template content.";
        const buffer = Buffer.from(fileContent);
        const key = `test-verification/${testFileName}`;

        console.log(`   Attempting to upload test file: ${key}`);
        await uploadVisaDocument(key, buffer, "text/plain");
        console.log(`   ✓ Upload successful.`);

        console.log(`   Attempting to generate signed URL...`);
        const signedUrl = await getSignedDocumentUrl(key, 60);

        if (signedUrl && signedUrl.startsWith("http")) {
            console.log(`   ✓ Signed URL generated successfully: ${signedUrl.substring(0, 50)}...`);
        } else {
            throw new Error("Generated URL is invalid");
        }

    } catch (error: any) {
        console.error(`   ❌ MinIO verification failed: ${error.message}`);
        console.log(`   (This might happen if MinIO is not running locally or keys are invalid)`);
        // We don't exit here because local dev might mock S3 or use a local instance that isn't running
    }

    console.log("\n✅ Verification script completed.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
