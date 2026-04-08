import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const accessToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
        const instagramAccountId = Deno.env.get('INSTAGRAM_BUSINESS_ACCOUNT_ID');

        if (!accessToken) {
            return Response.json({ 
                error: 'Facebook access token not configured. Contact admin.',
                success: false 
            }, { status: 400 });
        }

        const { platform } = await req.json();

        let accountData;

        if (platform === 'facebook') {
            // Fetch Facebook page info
            const response = await fetch(`https://graph.facebook.com/me?fields=id,name,picture.type(large)&access_token=${accessToken}`);
            const data = await response.json();

            if (!data.id) {
                return Response.json({ 
                    error: 'Failed to fetch Facebook page',
                    success: false 
                }, { status: 400 });
            }

            accountData = {
                platform: 'facebook',
                username: data.name?.toLowerCase().replace(/\s+/g, '.') || 'facebook_page',
                accountName: data.name || 'Facebook Page',
                profilePicture: data.picture?.data?.url,
                accountId: data.id,
                isConnected: true,
                accessToken: accessToken,
                success: true
            };
        } else if (platform === 'instagram') {
            if (!instagramAccountId) {
                return Response.json({ 
                    error: 'Instagram account ID not configured. Contact admin.',
                    success: false 
                }, { status: 400 });
            }

            // Fetch Instagram business account info
            const response = await fetch(
                `https://graph.instagram.com/${instagramAccountId}?fields=id,username,name,profile_picture_url,followers_count&access_token=${accessToken}`
            );
            const data = await response.json();

            if (!data.id) {
                return Response.json({ 
                    error: 'Failed to fetch Instagram account',
                    success: false 
                }, { status: 400 });
            }

            accountData = {
                platform: 'instagram',
                username: data.username || 'instagram_account',
                accountName: data.name || data.username || 'Instagram Account',
                profilePicture: data.profile_picture_url,
                followerCount: data.followers_count || 0,
                accountId: data.id,
                isConnected: true,
                accessToken: accessToken,
                success: true
            };
        } else {
            return Response.json({ 
                error: `Platform ${platform} not yet configured`,
                success: false 
            }, { status: 400 });
        }

        return Response.json(accountData);
    } catch (error) {
        console.error('Error:', error);
        return Response.json({ 
            error: error.message, 
            success: false 
        }, { status: 500 });
    }
});