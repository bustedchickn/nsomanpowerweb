document.addEventListener("DOMContentLoaded", async () => {
    const db = firebase.firestore();
    const selector = document.getElementById("conference_selector");
    const matrixContainer = document.getElementById("assignment_matrix");

    const snapshot = await db.collection("conferences").get();
    snapshot.forEach(doc => {
        const option = document.createElement("option");
        option.value = doc.id;
        option.textContent = doc.data().name;
        selector.appendChild(option);
    });

    selector.addEventListener("change", async () => {
        const confId = selector.value;
        if (!confId) return;

        const workersSnap = await db.collection("workers").get();
        const workers = workersSnap.docs.map(doc => doc.data());

        const eventsSnap = await db.collection("conferences")
            .doc(confId)
            .collection("events")
            .get();

        const eventData = [];
        for (const eventDoc of eventsSnap.docs) {
            const tasksSnap = await eventDoc.ref.collection("tasks").get();
            eventData.push({
                id: eventDoc.id,
                title: eventDoc.data().title,
                tasks: tasksSnap.docs.map(t => t.data())
            });
        }

        renderMatrix(workers, eventData);
    });

    function renderMatrix(workers, events) {
        matrixContainer.innerHTML = "";
        const table = document.createElement("table");
        table.border = "1";

        // Header row
        const header = document.createElement("tr");
        header.appendChild(document.createElement("th")); // top-left corner
        for (const event of events) {
            const th = document.createElement("th");
            th.textContent = event.title;
            header.appendChild(th);
        }
        table.appendChild(header);

        // Each worker row
        for (const worker of workers) {
            const row = document.createElement("tr");
            const nameCell = document.createElement("td");
            nameCell.textContent = worker.name;
            row.appendChild(nameCell);

            for (const event of events) {
                const cell = document.createElement("td");
                const relevantTasks = event.tasks.filter(task =>
                    task.roles.includes(worker.role)
                );

                if (relevantTasks.length > 0) {
                    relevantTasks.forEach(task => {
                        const div = document.createElement("div");
                        div.textContent = `• ${task.description} (${task.requiredCount})`;
                        cell.appendChild(div);
                    });
                } else {
                    cell.textContent = "-";
                }

                row.appendChild(cell);
            }

            table.appendChild(row);
        }

        matrixContainer.appendChild(table);
    }
});
