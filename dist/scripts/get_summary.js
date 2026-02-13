import { authService } from '../auth.js';
import axios from 'axios';
async function getSummary() {
    const memberId = "2571"; // Jose de Lucas
    const days = 30;
    try {
        console.log(`Fetching summary for member ${memberId} (last ${days} days)...`);
        // Ensure authentication
        const token = await authService.ensureAuthenticated();
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        // Dates
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];
        // Fetch trackings
        const trackingsUrl = `https://apis-tgx.swevenbpm.com/v4/trackings?team_member_id=${memberId}&limit=1000&sort_order=DESC&sort_column=start_date&is_active=0&start_date=${startStr}&end_date=${endStr}`;
        const trackingsResponse = await axios.get(trackingsUrl, { headers });
        const trackings = trackingsResponse.data.data;
        // Fetch notes
        const notesUrl = `https://apis-tgx.swevenbpm.com/v4/notes?sort_column=created_date&sort_order=desc&created_by=${memberId}&created_date_from=${startStr}&created_date_to=${endStr}&limit=1000`;
        const notesResponse = await axios.get(notesUrl, { headers });
        const notes = notesResponse.data.notes;
        // Calculate summary
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
            member_id: memberId,
            period: `${startStr} to ${endStr}`,
            total_time: `${String(totalHours).padStart(2, '0')}:${String(totalMinutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`,
            total_active_hours: (totalDurationMillis / (1000 * 60 * 60)).toFixed(2),
            total_notes: notes.length,
            total_work_orders: uniqueWorkOrderIds.size,
            detailed_by_date: Object.fromEntries(Object.entries(timesByDate).map(([date, millis]) => [
                date,
                (millis / (1000 * 60 * 60)).toFixed(2) + " hours"
            ]))
        };
        console.log(JSON.stringify(summary, null, 2));
    }
    catch (error) {
        console.error("Error fetching summary:", error.message);
        if (error.response) {
            console.error("Response data:", JSON.stringify(error.response.data, null, 2));
        }
    }
}
getSummary();
