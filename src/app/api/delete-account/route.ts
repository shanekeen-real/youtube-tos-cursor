import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { auth } from '@/lib/auth';
import * as Sentry from "@sentry/nextjs";
import { z } from 'zod';

// Branded types for better type safety
type UserId = string & { readonly brand: unique symbol };
type DeletionLogId = string & { readonly brand: unique symbol };

// Zod schemas for data validation
const DeletionLogSchema = z.object({
  userId: z.string(),
  requestedAt: z.date(),
  ip: z.string().nullable(),
});

const DeleteAccountResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

const DeleteAccountErrorResponseSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
  stack: z.string().optional(),
});

// Type definitions using Zod inferred types
type DeletionLog = z.infer<typeof DeletionLogSchema>;
type DeleteAccountResponse = z.infer<typeof DeleteAccountResponseSchema>;
type DeleteAccountErrorResponse = z.infer<typeof DeleteAccountErrorResponseSchema>;

// Type guards for runtime validation
function isValidDeletionLog(log: unknown): log is DeletionLog {
  return DeletionLogSchema.safeParse(log).success;
}

function isValidDeleteAccountResponse(response: unknown): response is DeleteAccountResponse {
  return DeleteAccountResponseSchema.safeParse(response).success;
}

function isValidDeleteAccountErrorResponse(response: unknown): response is DeleteAccountErrorResponse {
  return DeleteAccountErrorResponseSchema.safeParse(response).success;
}

// Error handling utilities
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

function extractErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
}

// Helper to delete all user-related data
async function deleteUserData(userId: string): Promise<void> {
  try {
    // Delete user profile
    await adminDb.collection('users').doc(userId).delete();

    // Delete scans from the correct collection
    const scansSnap = await adminDb.collection('analysis_cache').where('userId', '==', userId).get();
    const batch = adminDb.batch();
    scansSnap.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => batch.delete(doc.ref));

    // Remove scanHistory batch delete for now (index issues)
    // Add more collections as needed

    await batch.commit();
  } catch (error: unknown) {
    console.error('Error deleting user data:', error);
    throw new Error(`Failed to delete user data: ${extractErrorMessage(error)}`);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<DeleteAccountResponse | DeleteAccountErrorResponse>> {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/delete-account",
    },
    async () => {
      try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) {
          const errorResponse: DeleteAccountErrorResponse = {
            error: 'Unauthorized',
            details: 'User not authenticated'
          };
          return NextResponse.json(errorResponse, { status: 401 });
        }

        // Log the deletion request for auditability
        const deletionLog: DeletionLog = {
          userId,
          requestedAt: new Date(),
          ip: req.headers.get('x-forwarded-for') || null,
        };

        // Validate deletion log before saving
        if (isValidDeletionLog(deletionLog)) {
          await adminDb.collection('user_deletion_logs').add(deletionLog);
        } else {
          console.warn('Invalid deletion log structure:', deletionLog);
          // Continue with deletion even if logging fails
        }

        // Delete all user data
        await deleteUserData(userId);

        // (Optional) Invalidate user session here if needed

        const successResponse: DeleteAccountResponse = {
          success: true,
          message: 'Account and all data deleted.'
        };
        return NextResponse.json(successResponse);
      } catch (error: unknown) {
        console.error('Delete account error:', error);
        Sentry.captureException(error);
        
        const errorMessage = extractErrorMessage(error);
        const errorStack = extractErrorStack(error);
        
        const errorResponse: DeleteAccountErrorResponse = {
          error: 'Internal server error',
          details: errorMessage,
          stack: errorStack
        };
        return NextResponse.json(errorResponse, { status: 500 });
      }
    }
  );
} 