import { authService } from '../auth.js';
import axios from 'axios';
async function testGetTeamMembers() {
    console.log("Testing get_team_members logic...");
    try {
        // Imitate getHeaders logic from index.ts
        console.log("Calling authService.ensureAuthenticated()...");
        const token = await authService.ensureAuthenticated();
        console.log("Token obtained:", token ? "Yes" : "No");
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        console.log("Fetching team members...");
        const response = await axios.get('https://autodispatch.swevenbpm.com/v1/admin/team-members', { headers });
        console.log("Response status:", response.status);
        console.log("Team members:", JSON.stringify(response.data, null, 2));
    }
    catch (error) {
        console.error("Error in test:", error.message);
        if (error.response) {
            console.error("Response data:", JSON.stringify(error.response.data, null, 2));
        }
    }
}
testGetTeamMembers();
