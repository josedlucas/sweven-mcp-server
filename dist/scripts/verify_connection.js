import { authService } from '../auth.js';
import axios from 'axios';
async function test() {
    console.log("Starting verification...");
    const email = "<YOUR_EMAIL>";
    const password = "<YOUR_PASSWORD>";
    try {
        console.log("Testing Login...");
        // Ensure you have run 'npm run build' before running this script if using node.
        // Or specific ts-node setup.
        // This script is intended to be run after you have set credentials via the MCP tool or manually in config.json
        // But for testing purposes, we demonstrate explicit login call here.
        if (email === "<YOUR_EMAIL>") {
            console.log("Please set email and password in the script or config.json");
            // Start interactive prompt or throw error
            return;
        }
        const token = await authService.login(email, password);
        console.log("Login successful. Token:", token.substring(0, 20) + "...");
        console.log("\nTesting Get Team Members...");
        const teamResponse = await axios.get('https://autodispatch.swevenbpm.com/v1/admin/team-members', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log("Team Members found:", teamResponse.data && teamResponse.data.length);
        if (teamResponse.data && teamResponse.data.length > 0) {
            const memberId = teamResponse.data[0].id; // Use the first member for testing
            console.log(`\nTesting Get Trackings Summary for member ${memberId}...`);
            // Set date range for testing (e.g., last 30 days)
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 30);
            const startStr = startDate.toISOString().split('T')[0];
            const endStr = endDate.toISOString().split('T')[0];
            console.log(`Date range: ${startStr} to ${endStr}`);
            // Replicating the logic from index.ts to verify it works (simplified)
            const trackingsUrl = `https://apis-tgx.swevenbpm.com/v4/trackings?team_member_id=${memberId}&limit=10&sort_order=DESC&sort_column=start_date&is_active=0&start_date=${startStr}&end_date=${endStr}`;
            const trackingsResponse = await axios.get(trackingsUrl, { headers: { 'Authorization': `Bearer ${token}` } });
            console.log("Trackings found:", trackingsResponse.data.data.length);
            // Replicating the notes logic
            const notesUrl = `https://apis-tgx.swevenbpm.com/v4/notes?sort_column=created_date&sort_order=desc&created_by=${memberId}&limit=5`;
            const notesResponse = await axios.get(notesUrl, { headers: { 'Authorization': `Bearer ${token}` } });
            console.log("Notes found:", notesResponse.data.notes.length);
        }
        console.log("\nVerification Complete!");
    }
    catch (error) {
        console.error("Verification Failed:", error.message);
        if (error.response) {
            console.error("Response data:", error.response.data);
        }
    }
}
test();
