document.addEventListener("DOMContentLoaded", async () => {
    const firebaseConfig = {
        apiKey: "AIzaSyBAjMXpCk3G7vL17OpTCwWuVp_c7nSKiEc",
        authDomain: "nsomanpowerweb.firebaseapp.com",
        projectId: "nsomanpowerweb",
        storageBucket: "nsomanpowerweb.firebasestorage.app",
        messagingSenderId: "293078398444",
        appId: "1:293078398444:web:4a0ebb1e14f5dc8363bcc9",
        measurementId: "G-MWK33F0V4B"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.firestore();
    const selector = document.getElementById("conference_selector");
    const matrixContainer = document.getElementById("assignment_matrix");
    
    

    const snapshot = await db.collection("conferences").get();
    snapshot.forEach(doc => {
        const option = document.createElement("option");
        option.value = doc.id;
        option.textContent = doc.data().name;
        selector.appendChild(option);
        if (selector.options.length > 0) {
            selector.value = selector.options[0].value;
            selector.dispatchEvent(new Event("change"));
        }

    });

    document.getElementById("assign_button").addEventListener("click", () => {change_thing()});

    selector.addEventListener("change", async () => {
        change_thing()
        

    });

    async function change_thing() {
        const confId = selector.value;
        if (!confId) return;

        const workersSnap = await db.collection("workers").get();
        const workersWithIds = workersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));


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

        await assignAndRenderMatrix(workersWithIds, eventData, confId);
    }

    async function assignAndRenderMatrix(workers, events, conferenceId) {
        const table = document.createElement("table");
        table.border = "1";

        const header = document.createElement("tr");
        header.appendChild(document.createElement("th")); // Name column
        for (const event of events) {
            const th = document.createElement("th");
            th.textContent = event.title;
            header.appendChild(th);
        }
        table.appendChild(header);

        // Clear old assignments
        for (const worker of workers) {
            const workerRef = await db.collection("workers").doc(worker.id);
            const existing = await workerRef.collection("assignments").get();
            const batch = db.batch();
            existing.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }

        // Distribute tasks
        const taskAssignments = {}; // eventId -> taskId -> [assignedWorkerIds]

        for (const event of events) {
            for (const task of event.tasks) {
                const eligibleWorkers = workers.filter(w => task.roles.includes(w.role));
                shuffleArray(eligibleWorkers);
                const assigned = eligibleWorkers.slice(0, task.requiredCount);

                taskAssignments[event.id] ??= {};
                taskAssignments[event.id][task.description] = assigned;

                for (const worker of assigned) {
                    const ref = db.collection("workers").doc(worker.id)
                        .collection("assignments").doc();

                    await ref.set({
                        eventId: event.id,
                        taskId: task.id || "", // Save if task has ID
                        taskDescription: task.description,
                        conferenceId,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
        }

        // Render matrix
        for (const worker of workers) {
            const row = document.createElement("tr");
            const nameCell = document.createElement("td");
            nameCell.textContent = worker.name;
            row.appendChild(nameCell);

            for (const event of events) {
                const cell = document.createElement("td");
                const assignedTasks = [];

                for (const task of event.tasks) {
                    const assigned = taskAssignments[event.id]?.[task.description] || [];
                    if (assigned.some(w => w.id === worker.id)) {
                        assignedTasks.push(`• ${task.description}`);
                    }
                }

                cell.textContent = assignedTasks.length > 0 ? assignedTasks.join("\n") : "-";
                row.appendChild(cell);
            }

            table.appendChild(row);
        }

        matrixContainer.innerHTML = "";
        matrixContainer.appendChild(table);
    }

    // Utility
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

});
