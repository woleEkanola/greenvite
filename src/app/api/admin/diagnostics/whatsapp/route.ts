import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/admin/diagnostics/whatsapp
 * Diagnostic endpoint to check WhatsApp API configuration
 * Only returns masked values for security
 */
export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get WhatsApp configuration values
    const token = process.env.WAAPI_TOKEN;
    const baseUrl = process.env.WAAPI_BASE_URL;
    const instanceId = process.env.WAAPI_INSTANCE_ID;

    // Check for common issues
    const issues = [];

    if (!token) {
      issues.push('WAAPI_TOKEN is missing');
    } else {
      if (token.startsWith('"') || token.endsWith('"')) {
        issues.push('WAAPI_TOKEN contains quote characters which may cause authentication issues');
      }
      if (token.includes(' ')) {
        issues.push('WAAPI_TOKEN contains spaces which may cause authentication issues');
      }
    }

    if (!baseUrl) {
      issues.push('WAAPI_BASE_URL is missing');
    }

    if (!instanceId) {
      issues.push('WAAPI_INSTANCE_ID is missing');
    }

    // Return masked configuration for security
    return new NextResponse(
      JSON.stringify({
        success: true,
        config: {
          tokenConfigured: !!token,
          tokenLength: token ? token.length : 0,
          tokenFirstChars: token ? token.substring(0, 4) + '...' : null,
          tokenHasQuotes: token ? (token.startsWith('"') || token.endsWith('"')) : false,
          tokenHasSpaces: token ? token.includes(' ') : false,
          baseUrl: baseUrl || 'Not configured',
          instanceIdConfigured: !!instanceId,
          instanceIdFirstChars: instanceId ? instanceId.substring(0, 4) + '...' : null,
        },
        issues: issues.length > 0 ? issues : null,
        recommendations: issues.length > 0 ? [
          'Make sure all environment variables are set correctly',
          'Remove any quotes or spaces from the WAAPI_TOKEN',
          'Check that your WhatsApp API subscription is active',
          'Verify that the instance ID is correct and the instance is running'
        ] : []
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in WhatsApp diagnostics:', error);
    return new NextResponse(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
