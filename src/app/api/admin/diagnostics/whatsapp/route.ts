import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as evolutionClient from '@/lib/evolution-api/client';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const evolutionApiUrl = process.env.EVOLUTION_API_URL;
    const evolutionApiKey = process.env.EVOLUTION_GLOBAL_API_KEY;

    const issues = [];

    if (!evolutionApiUrl) {
      issues.push('EVOLUTION_API_URL is missing');
    }

    if (!evolutionApiKey) {
      issues.push('EVOLUTION_GLOBAL_API_KEY is missing');
    } else {
      if (evolutionApiKey.startsWith('"') || evolutionApiKey.endsWith('"')) {
        issues.push('EVOLUTION_GLOBAL_API_KEY contains quote characters which may cause authentication issues');
      }
      if (evolutionApiKey.includes(' ')) {
        issues.push('EVOLUTION_GLOBAL_API_KEY contains spaces which may cause authentication issues');
      }
    }

    let connectedInstances: any[] = [];
    let fetchError: string | null = null;

    try {
      connectedInstances = await evolutionClient.fetchInstances();
    } catch (error) {
      fetchError = error instanceof Error ? error.message : 'Failed to fetch instances';
      console.error('Error fetching Evolution API instances:', error);
    }

    const dbInstances = await prisma.evolutionInstance.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return new NextResponse(
      JSON.stringify({
        success: true,
        config: {
          evolutionApiUrl: evolutionApiUrl || 'Not configured',
          apiKeyConfigured: !!evolutionApiKey,
          apiKeyLength: evolutionApiKey ? evolutionApiKey.length : 0,
          apiKeyFirstChars: evolutionApiKey ? evolutionApiKey.substring(0, 4) + '...' : null,
          apiKeyHasQuotes: evolutionApiKey ? (evolutionApiKey.startsWith('"') || evolutionApiKey.endsWith('"')) : false,
          apiKeyHasSpaces: evolutionApiKey ? evolutionApiKey.includes(' ') : false,
        },
        instances: {
          total: dbInstances.length,
          connected: dbInstances.filter(i => i.status === 'connected').length,
          list: dbInstances.map(i => ({
            instanceName: i.instanceName,
            status: i.status,
            ownerId: i.ownerId,
            createdAt: i.createdAt,
          })),
          evolutionApiInstances: connectedInstances.map((i: any) => ({
            name: i.instance?.instanceName || i.name || i.instanceName,
            state: i.instance?.state || i.state || 'unknown',
          })),
          fetchError,
        },
        issues: issues.length > 0 ? issues : null,
        recommendations: issues.length > 0 ? [
          'Make sure EVOLUTION_API_URL and EVOLUTION_GLOBAL_API_KEY are set correctly',
          'Remove any quotes or spaces from EVOLUTION_GLOBAL_API_KEY',
          'Check that the Evolution API server is running and accessible',
          'Verify that WhatsApp instances are connected and logged in',
        ] : [],
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