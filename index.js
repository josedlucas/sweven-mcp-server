"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const axios_1 = __importDefault(require("axios"));
const auth_js_1 = require("./auth.js");
// Create an MCP server
const server = new mcp_js_1.McpServer({
    name: "sweven-mcp-server",
    version: "1.0.0"
});
// Helper to get authenticated headers
const getHeaders = async () => {
    const token = await auth_js_1.authService.login();
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};
// Tool: set_credentials
server.tool("set_credentials", "Set the email and password for Sweven API authentication", {
    email: zod_1.z.string().email(),
    password: zod_1.z.string()
}, async ({ email, password }) => {
    try {
        await auth_js_1.authService.login(email, password);
        return {
            content: [{ type: "text", text: "Credentials set and login successful." }]
        };
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: `Failed to set credentials: ${error.message}` }]
        };
    }
});
// Tool: get_team_members
server.tool("get_team_members", "Get the list of team members from Sweven", {}, async () => {
    try {
        const headers = await getHeaders();
        const response = await axios_1.default.get('https://autodispatch.swevenbpm.com/v1/admin/team-members', { headers });
        return {
            content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
        };
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: `Error fetching team members: ${error.message}` }]
        };
    }
});
// Tool: get_trackings_summary
server.tool("get_trackings_summary", "Get tracking summary for a team member, including time worked and notes count", {
    team_member_id: zod_1.z.string(),
    start_date: zod_1.z.string().describe("Start date in YYYY-MM-DD format"),
    end_date: zod_1.z.string().describe("End date in YYYY-MM-DD format"),
    limit: zod_1.z.number().optional().default(100)
}, async ({ team_member_id, start_date, end_date, limit }) => {
    try {
        const headers = await getHeaders();
        // Fetch trackings
        const trackingsUrl = `https://apis-tgx.swevenbpm.com/v4/trackings?team_member_id=${team_member_id}&limit=${limit}&sort_order=DESC&sort_column=start_date&is_active=0&start_date=${start_date}&end_date=${end_date}`;
        const trackingsResponse = await axios_1.default.get(trackingsUrl, { headers });
        const trackings = trackingsResponse.data.data;
        // Fetch notes (to get count)
        const notesUrl = `https://apis-tgx.swevenbpm.com/v4/notes?sort_column=created_date&sort_order=desc&created_by=${team_member_id}&created_date_from=${start_date}&created_date_to=${end_date}&limit=1000`;
        const notesResponse = await axios_1.default.get(notesUrl, { headers });
        const notes = notesResponse.data.notes;
        // Calculate summary (logic ported from popup.js)
        let totalDurationMillis = 0;
        const uniqueWorkOrderIds = new Set();
        const workOrdersByDate = {};
        const timesByDate = {};
        trackings.forEach((entry) => {
            const startDateObj = new Date(entry.start_date + 'Z');
            const endDateObj = new Date(entry.end_date + 'Z');
            const date = startDateObj.toISOString().split('T')[0];
            const durationMillis = endDateObj.getTime() - startDateObj.getTime();
            totalDurationMillis += durationMillis;
            if (!timesByDate[date])
                timesByDate[date] = 0;
            timesByDate[date] += durationMillis;
            if (!workOrdersByDate[date])
                workOrdersByDate[date] = [];
            if (entry.work_order_code) {
                const totalSeconds = Math.floor(durationMillis / 1000);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                const workOrderString = `${entry.work_order_code}|${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}|${entry.work_order_id}`;
                if (!workOrdersByDate[date].includes(workOrderString)) {
                    workOrdersByDate[date].push(workOrderString);
                }
                uniqueWorkOrderIds.add(entry.work_order_id);
            }
        });
        const totalSeconds = Math.floor(totalDurationMillis / 1000);
        const totalHours = Math.floor(totalSeconds / 3600);
        const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
        const remainingSeconds = totalSeconds % 60;
        const summary = {
            total_time: `${String(totalHours).padStart(2, '0')}:${String(totalMinutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`,
            total_notes: notes.length,
            total_work_orders: uniqueWorkOrderIds.size,
            detailed_by_date: timesByDate
        };
        return {
            content: [{ type: "text", text: JSON.stringify(summary, null, 2) }]
        };
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: `Error fetching tracking summary: ${error.message}` }]
        };
    }
});
// Tool: get_notes
server.tool("get_notes", "Get notes for a team member", {
    team_member_id: zod_1.z.string(),
    start_date: zod_1.z.string().optional(),
    end_date: zod_1.z.string().optional()
}, async ({ team_member_id, start_date, end_date }) => {
    try {
        const headers = await getHeaders();
        let url = `https://apis-tgx.swevenbpm.com/v4/notes?sort_column=created_date&sort_order=desc&created_by=${team_member_id}&limit=1000`;
        if (start_date && end_date) {
            url += `&created_date_from=${start_date}&created_date_to=${end_date}`;
        }
        const response = await axios_1.default.get(url, { headers });
        return {
            content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
        };
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: `Error fetching notes: ${error.message}` }]
        };
    }
});
// Tool: get_work_order_details
server.tool("get_work_order_details", "Get details for a specific work order", {
    work_order_id: zod_1.z.string()
}, async ({ work_order_id }) => {
    try {
        const headers = await getHeaders();
        const response = await axios_1.default.get(`https://apis-tgx.swevenbpm.com/v4/work-order/${work_order_id}`, { headers });
        return {
            content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
        };
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: `Error fetching work order details: ${error.message}` }]
        };
    }
});
// Start the server
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("Sweven MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map