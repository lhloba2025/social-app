import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const editsJson = formData.get('edits');

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Parse edits - مصفوفة من التعديلات
    let edits = {};
    if (editsJson) {
      try {
        edits = JSON.parse(editsJson);
      } catch (e) {
        return Response.json({ error: 'Invalid edits JSON' }, { status: 400 });
      }
    }

    // Validate file size (max 50MB)
    const buffer = await file.arrayBuffer();
    if (buffer.byteLength > 50 * 1024 * 1024) {
      return Response.json(
        { error: 'File too large (max 50MB)' },
        { status: 400 }
      );
    }

    // For now, just validate and upload - client handles visual editing
    // Server focuses on file handling and validation
    const uploadResult = await base44.integrations.Core.UploadFile({
      file: file,
    });

    return Response.json({
      success: true,
      url: uploadResult.file_url,
      originalName: file.name,
      size: buffer.byteLength,
    });
  } catch (error) {
    console.error('Edit error:', error);
    return Response.json(
      { error: error.message || 'Failed to process media' },
      { status: 500 }
    );
  }
});