import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import axios from "axios";
import express from "express";
import cors from "cors";
import { authService } from "./auth.js";
// --- CONFIGURACIÓN DE EXPRESS ---
const app = express();
app.use(cors());
// IMPORTANTE: Aumentamos límite por seguridad y habilitamos JSON
app.use(express.json({ limit: "10mb" }));
// Helper para headers
const getHeaders = async () => {
    const token = await authService.ensureAuthenticated();
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};
// --- FÁBRICA DE SERVIDORES (ESTA ES LA FUNCIÓN QUE FALTABA) ---
function createSwevenServer() {
    const server = new McpServer({
        name: "sweven-mcp-server",
        version: "1.0.0"
    });
    server.tool("set_credentials", "Set the email and password for Sweven API authentication", {
        email: z.string().email(),
        password: z.string()
    }, async ({ email, password }) => {
        try {
            await authService.login(email, password);
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
    server.tool("get_team_members", "Get the list of team members from Sweven", {}, async () => {
        try {
            const headers = await getHeaders();
            const response = await axios.get('https://autodispatch.swevenbpm.com/v1/admin/team-members', { headers });
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
    server.tool("get_trackings_summary", "Get tracking summary for a team member, including time worked and notes count", {
        team_member_id: z.string(),
        start_date: z.string().describe("Start date in YYYY-MM-DD format"),
        end_date: z.string().describe("End date in YYYY-MM-DD format"),
        limit: z.number().optional().default(100)
    }, async ({ team_member_id, start_date, end_date, limit }) => {
        try {
            const headers = await getHeaders();
            const trackingsUrl = `https://apis-tgx.swevenbpm.com/v4/trackings?team_member_id=${team_member_id}&limit=${limit}&sort_order=DESC&sort_column=start_date&is_active=0&start_date=${start_date}&end_date=${end_date}`;
            const trackingsResponse = await axios.get(trackingsUrl, { headers });
            const trackings = trackingsResponse.data.data;
            const notesUrl = `https://apis-tgx.swevenbpm.com/v4/notes?sort_column=created_date&sort_order=desc&created_by=${team_member_id}&created_date_from=${start_date}&created_date_to=${end_date}&limit=1000`;
            const notesResponse = await axios.get(notesUrl, { headers });
            const notes = notesResponse.data.notes;
            let totalDurationMillis = 0;
            const uniqueWorkOrderIds = new Set();
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
                if (entry.work_order_code) {
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
    server.tool("get_notes", "Get notes for a team member", {
        team_member_id: z.string(),
        start_date: z.string().optional(),
        end_date: z.string().optional()
    }, async ({ team_member_id, start_date, end_date }) => {
        try {
            const headers = await getHeaders();
            let url = `https://apis-tgx.swevenbpm.com/v4/notes?sort_column=created_date&sort_order=desc&created_by=${team_member_id}&limit=1000`;
            if (start_date && end_date) {
                url += `&created_date_from=${start_date}&created_date_to=${end_date}`;
            }
            const response = await axios.get(url, { headers });
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
    server.tool("get_work_order_details", "Get details for a specific work order", {
        work_order_id: z.string()
    }, async ({ work_order_id }) => {
        try {
            const headers = await getHeaders();
            const response = await axios.get(`https://apis-tgx.swevenbpm.com/v4/work-order/${work_order_id}`, { headers });
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
    return server;
}
// --- GESTIÓN DE SESIONES ---
// Mapa para guardar las sesiones activas
const activeTransports = new Map();
app.get("/sse", async (req, res) => {
    console.log("Nueva conexión SSE entrante...");
    // Headers correctos usando setHeader (evita el crash de headers sent)
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    const server = createSwevenServer();
    // 👇 ESTA ES LA CLAVE: URL COMPLETA 👇
    const transport = new SSEServerTransport("https://sweven-mcp-server.onrender.com/messages", res);
    console.log(`Sesión iniciada: ${transport.sessionId}`);
    activeTransports.set(transport.sessionId, transport);
    try {
        await server.connect(transport);
    }
    catch (err) {
        console.error("Error conectando servidor:", err);
    }
    req.on("close", () => {
        console.log(`Cerrando sesión: ${transport.sessionId}`);
        activeTransports.delete(transport.sessionId);
        server.close();
    });
});
app.post("/messages", async (req, res) => {
    // Buscar sessionId en Query URL o en Body JSON
    let sessionId = req.query.sessionId;
    if (!sessionId && req.body && req.body.sessionId) {
        sessionId = req.body.sessionId;
    }
    if (!sessionId) {
        res.status(400).json({ error: "Session ID missing" });
        return;
    }
    const transport = activeTransports.get(sessionId);
    if (!transport) {
        console.error(`Sesión ${sessionId} no encontrada.`);
        res.status(404).json({ error: "Session not found" });
        return;
    }
    await transport.handlePostMessage(req, res);
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Sweven MCP Server running on port ${PORT}`);
});
