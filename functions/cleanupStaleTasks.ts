// Auto-cleanup: cancel stale open tasks older than 24 hours
import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }});
  }

  const hdr = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const restaurantId = body.restaurant_id || body.filters?.restaurant_id;

    if (!restaurantId) {
      return new Response(JSON.stringify({ error: "Missing restaurant_id" }), { status: 400, headers: hdr });
    }

    // Fetch all open tasks for this restaurant
    const tasks = await base44.asServiceRole.entities.Task.filter({
      restaurant_id: restaurantId,
      status: "open"
    });

    // Find tasks older than 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const staleTasks = (tasks || []).filter(t => {
      const created = new Date(t.created_at || t.created_date || 0);
      return created < twentyFourHoursAgo;
    });

    // Cancel each stale task
    let cancelledCount = 0;
    for (const task of staleTasks) {
      try {
        await base44.asServiceRole.entities.Task.update(task.id, {
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancelled_by: "auto-cleanup"
        });
        cancelledCount++;
      } catch (e) {
        // Skip individual failures
      }
    }

    return new Response(JSON.stringify({
      success: true,
      checked: (tasks || []).length,
      cancelled: cancelledCount,
      remaining_open: (tasks || []).length - cancelledCount
    }), { status: 200, headers: hdr });
  } catch (err) {
    console.error("Cleanup error:", err);
    return new Response(JSON.stringify({
      error: err.message || "Internal server error"
    }), { status: 500, headers: hdr });
  }
});
