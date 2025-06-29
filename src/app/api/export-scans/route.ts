import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { generateCSV, generatePDF, downloadFile, generateFilename, type AnalysisData } from '@/lib/export-utils';
import * as Sentry from '@sentry/nextjs';

export async function POST(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/export-scans",
    },
    async () => {
      try {
        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { scanIds, format, options } = await req.json();

        if (!scanIds || !Array.isArray(scanIds) || scanIds.length === 0) {
          return NextResponse.json({ error: 'No scan IDs provided' }, { status: 400 });
        }

        if (!format || !['pdf', 'csv'].includes(format)) {
          return NextResponse.json({ error: 'Invalid format. Must be "pdf" or "csv"' }, { status: 400 });
        }

        // Fetch all scans from Firestore
        const scansRef = adminDb.collection('analysis_cache');
        const scanPromises = scanIds.map(async (scanId: string) => {
          const scanDoc = await scansRef.doc(scanId).get();
          if (scanDoc.exists) {
            const scanData = scanDoc.data();
            // Security check: ensure user owns this scan
            if (scanData?.userId === userId) {
              return {
                id: scanId,
                ...scanData?.analysisResult,
                createdAt: scanData?.timestamp?.toDate?.() || scanData?.timestamp,
                url: scanData?.original_url,
                analyzed_content: scanData?.analyzed_content,
                analysis_source: scanData?.analysis_source,
              };
            }
          }
          return null;
        });

        const scans = (await Promise.all(scanPromises)).filter(Boolean);

        if (scans.length === 0) {
          return NextResponse.json({ error: 'No valid scans found' }, { status: 404 });
        }

        // Generate export based on format
        let content: string | Blob;
        let mimeType: string;
        let fileExtension: string;

        if (format === 'csv') {
          // For CSV, we'll create a combined report
          const csvData: any[] = [];
          
          csvData.push(['YouTube TOS Analysis - Bulk Export Report']);
          csvData.push(['Generated:', new Date().toLocaleString()]);
          csvData.push(['Total Scans:', scans.length]);
          csvData.push([]);

          scans.forEach((scan: AnalysisData, index: number) => {
            csvData.push([`=== Scan ${index + 1} ===`]);
            csvData.push(['Content Title:', scan.title || 'N/A']);
            csvData.push(['Content URL:', scan.url || 'N/A']);
            csvData.push(['Risk Level:', scan.riskLevel]);
            csvData.push(['Risk Score:', `${scan.riskScore}/100`]);
            csvData.push(['Created:', scan.createdAt?.toLocaleString() || 'N/A']);
            csvData.push([]);

            // Add policy categories if available
            if (scan.policy_categories) {
              csvData.push(['Policy Categories:']);
              csvData.push(['Category', 'Risk Score', 'Confidence', 'Severity']);
              Object.entries(scan.policy_categories).forEach(([category, analysis]: [string, any]) => {
                csvData.push([
                  category.replace(/_/g, ' '),
                  `${analysis.risk_score}%`,
                  `${analysis.confidence}%`,
                  analysis.severity
                ]);
              });
              csvData.push([]);
            }

            // Add suggestions if available
            if (scan.suggestions && scan.suggestions.length > 0 && options?.includeSuggestions) {
              csvData.push(['Suggestions:']);
              scan.suggestions.forEach((suggestion: any) => {
                csvData.push([suggestion.title, suggestion.text, suggestion.priority]);
              });
              csvData.push([]);
            }

            csvData.push([]); // Empty line between scans
          });

          content = csvData.map(row => row.join(',')).join('\n');
          mimeType = 'text/csv';
          fileExtension = 'csv';
        } else {
          // For PDF, we'll create a combined report
          const { jsPDF } = await import('jspdf');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pageWidth = pdf.internal.pageSize.getWidth();
          const margin = 20;
          const contentWidth = pageWidth - (margin * 2);
          let yPosition = margin;

          // Helper functions
          const addText = (text: string, y: number, fontSize: number = 10): number => {
            pdf.setFontSize(fontSize);
            const lines = pdf.splitTextToSize(text, contentWidth);
            pdf.text(lines, margin, y);
            return y + (lines.length * fontSize * 0.4);
          };

          const addSectionHeader = (title: string, y: number): number => {
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text(title, margin, y);
            return y + 8;
          };

          const addSubsection = (title: string, y: number): number => {
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text(title, margin, y);
            return y + 6;
          };

          // Title
          yPosition = addSectionHeader('YouTube TOS Analysis - Bulk Export Report', yPosition);
          yPosition = addText(`Generated: ${new Date().toLocaleString()}`, yPosition + 5);
          yPosition = addText(`Total Scans: ${scans.length}`, yPosition + 3);
          yPosition += 10;

          // Process each scan
          scans.forEach((scan: AnalysisData, index: number) => {
            if (yPosition > 250) {
              pdf.addPage();
              yPosition = margin;
            }

            yPosition = addSubsection(`Scan ${index + 1}: ${scan.title || 'Untitled'}`, yPosition);
            yPosition = addText(`URL: ${scan.url || 'N/A'}`, yPosition + 3);
            yPosition = addText(`Risk Level: ${scan.riskLevel} | Risk Score: ${scan.riskScore}/100`, yPosition + 3);
            yPosition = addText(`Created: ${scan.createdAt?.toLocaleString() || 'N/A'}`, yPosition + 3);

            // Add policy categories summary
            if (scan.policy_categories) {
              yPosition = addText('Policy Categories:', yPosition + 5);
              Object.entries(scan.policy_categories)
                .sort((a: any, b: any) => b[1].risk_score - a[1].risk_score)
                .slice(0, 3) // Show top 3
                .forEach(([category, analysis]: [string, any]) => {
                  yPosition = addText(`• ${category.replace(/_/g, ' ')}: ${analysis.risk_score}% risk`, yPosition + 2);
                });
            }

            yPosition += 10;
          });

          content = pdf.output('blob');
          mimeType = 'application/pdf';
          fileExtension = 'pdf';
        }

        // Generate filename
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `youtube_tos_bulk_analysis_${scans.length}_scans_${timestamp}.${fileExtension}`;

        // Return the file as a response
        return new NextResponse(content, {
          headers: {
            'Content-Type': mimeType,
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        });

      } catch (error: any) {
        console.error('Export scans error:', error);
        
        Sentry.captureException(error, {
          tags: { component: 'api', endpoint: 'export-scans' },
          extra: { 
            userId: session?.user?.id,
            scanIds: req.body ? 'provided' : 'missing'
          }
        });
        
        return NextResponse.json({
          error: 'Failed to export scans',
          details: error.message
        }, { status: 500 });
      }
    }
  );
} 