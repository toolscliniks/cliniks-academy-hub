import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  user_id?: string;
  user_ids?: string[];
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  category?: string;
  action_url?: string;
  metadata?: any;
  expires_at?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role for admin operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const requestData: NotificationRequest = await req.json();
    
    const {
      user_id,
      user_ids,
      title,
      message,
      type = 'info',
      category,
      action_url,
      metadata,
      expires_at
    } = requestData;

    if (!title || !message) {
      throw new Error("Title and message are required");
    }

    // Determine target users
    let targetUserIds: string[] = [];
    
    if (user_id) {
      targetUserIds = [user_id];
    } else if (user_ids && user_ids.length > 0) {
      targetUserIds = user_ids;
    } else {
      // Send to all users if no specific users specified
      const { data: allUsers, error: usersError } = await supabaseClient
        .from('profiles')
        .select('id');
      
      if (usersError) throw usersError;
      targetUserIds = allUsers?.map(user => user.id) || [];
    }

    if (targetUserIds.length === 0) {
      throw new Error("No target users found");
    }

    // Create notifications for all target users
    const notifications = targetUserIds.map(userId => ({
      user_id: userId,
      title,
      message,
      type,
      category,
      action_url,
      metadata,
      expires_at: expires_at ? new Date(expires_at).toISOString() : null,
      is_read: false
    }));

    const { data, error } = await supabaseClient
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) throw error;

    console.log(`Successfully created ${data?.length || 0} notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notifications sent to ${targetUserIds.length} users`,
        notifications_created: data?.length || 0
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Error in send-notification:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to send notification"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});