import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { platform, username } = await req.json();

        if (!platform || !username) {
            return Response.json({ error: 'Missing platform or username' }, { status: 400 });
        }

        const response = await base44.integrations.Core.InvokeLLM({
            prompt: `جلب بيانات حساب السوشيال ميديا من منصة ${platform}:
اسم المستخدم: ${username}
ابحث عن معلومات هذا الحساب وأرجع:
1. الاسم الكامل للحساب (Account Name)
2. عدد المتابعين (Follower Count)
3. رابط صورة البروفايل (Profile Picture URL)

يجب أن تكون البيانات دقيقة وحقيقية.`,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    accountName: { type: "string" },
                    followerCount: { type: "number" },
                    profilePictureUrl: { type: "string" },
                    success: { type: "boolean" }
                },
                required: ["success"]
            },
        });

        return Response.json(response.data);
    } catch (error) {
        console.error('Error:', error);
        return Response.json({ error: error.message, success: false }, { status: 500 });
    }
});