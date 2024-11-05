document.getElementById('banForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const playerID = document.getElementById('playerID').value;
    const reasonCode = document.getElementById('reasonCode').value;
    const endDate = document.getElementById('endDate').value;

    const response = await fetch('/bans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            playerID,
            banType: 'temporary',
            endDate,
            reasonCode,
            moderatorID: 'your-moderator-id'
        })
    });

    const data = await response.json();
    document.getElementById('response').textContent = data.message;
});
