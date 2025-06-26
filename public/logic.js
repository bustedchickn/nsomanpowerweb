document.addEventListener("DOMContentLoaded", () => {
    const firebaseConfig = {
        apiKey: "AIzaSyBAjMXpCk3G7vL17OpTCwWuVp_c7nSKiEc",
        authDomain: "nsomanpowerweb.firebaseapp.com",
        projectId: "nsomanpowerweb",
        storageBucket: "nsomanpowerweb.firebasestorage.app",
        messagingSenderId: "293078398444",
        appId: "1:293078398444:web:4a0ebb1e14f5dc8363bcc9",
        measurementId: "G-MWK33F0V4B"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    const eventForm = document.getElementById("event_generator");
    const eventBtn = document.getElementById("show_entries");
    const event_container = document.getElementById("event_container");
    const nameForm = document.getElementById("name_form");
    
    let currentEventNum = 0;

    let selectedConferenceId = null;
    let deletedTaskIds = new Set();
    let deletedEventIds = new Set();


    const savedId = localStorage.getItem("selectedConferenceId");
    if (savedId) {
        selectedConferenceId = savedId;
        loadEventsForConference(savedId);
    }


    // Load all conferences
    async function loadConferences() {
        const selector = document.getElementById("conference_selector");
        if (!selector) return;
        selector.innerHTML = "";

        const snapshot = await db.collection("conferences").get();
        snapshot.forEach(doc => {
            const option = document.createElement("option");
            option.value = doc.id;
            option.textContent = doc.data().name;
            selector.appendChild(option);
        });

        if (snapshot.docs.length > 0) {
            selectedConferenceId = snapshot.docs[0].id;
            loadEventsForConference(selectedConferenceId);
        }
    }

    if (document.getElementById("conference_selector")){
        document.getElementById("conference_selector").addEventListener("change", (e) => {
        selectedConferenceId = e.target.value;
        localStorage.setItem("selectedConferenceId", selectedConferenceId);
        loadEventsForConference(selectedConferenceId);
    });}

    if(document.getElementById("new_conference_btn")){
        document.getElementById("new_conference_btn").addEventListener("click", async () => {
        const name = prompt("Enter new conference name:");
        if (!name) return;

        const docRef = await db.collection("conferences").add({
            name,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        selectedConferenceId = docRef.id;
        localStorage.setItem("selectedConferenceId", selectedConferenceId);
        await loadConferences();

    });}

    async function loadEventsForConference(conferenceId) {
        const container = document.getElementById("event_container");
        
        if (!container) return;
        container.innerHTML = "";

        const eventsRef = db.collection("conferences").doc(conferenceId).collection("events");
        const snapshot = await eventsRef.get();

        snapshot.forEach(doc => {
            createEditableEventCard(doc.id, doc.data());
        });
    }

    function createEditableEventCard(eventId, eventData) {
        const container = document.getElementById("event_container");
        if (!container) return;

        const card = document.createElement("div");
        card.classList.add("event-card");

        const titleInput = document.createElement("input");
        titleInput.value = eventData.title || "";

        const taskList = document.createElement("div");
        taskList.classList.add("task-list");

        const saveBtn = document.createElement("button");
        saveBtn.textContent = "Save Event & Tasks";
        saveBtn.addEventListener("click", async () => {
            const eventRef = db.collection("conferences")
                            .doc(selectedConferenceId)
                            .collection("events")
                            .doc(eventId);

            await eventRef.set({ title: titleInput.value });

            // Clear old tasks and rewrite
            const tasksRef = eventRef.collection("tasks");
            const existingTasks = await tasksRef.get();
            for (const task of existingTasks.docs) {
                await task.ref.delete();
            }

            const tasks = taskList.querySelectorAll(".task");
            for (const t of tasks) {
                const description = t.querySelector("textarea").value.trim();
                const selectedRoles = Array.from(t.querySelectorAll("input[type='checkbox']:checked"))
                                        .map(cb => cb.value);

                if (description) {
                    await tasksRef.add({
                        description,
                        roles: selectedRoles,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            }

            alert("Event updated.");
        });

        card.appendChild(titleInput);
        card.appendChild(taskList);
        card.appendChild(addTaskButton(taskList));
        card.appendChild(saveBtn);

        container.appendChild(card);

        // Load existing tasks
        loadTasksForEvent(selectedConferenceId, eventId, taskList);
    }

    async function loadTasksForEvent(confId, eventId, taskListElement) {
        const snapshot = await db
            .collection("conferences")
            .doc(confId)
            .collection("events")
            .doc(eventId)
            .collection("tasks")
            .get();

        snapshot.forEach(doc => {
            const taskEl = createTaskElement(doc.data());
            taskListElement.appendChild(taskEl);
        });
    }


    if (eventForm) {eventForm.addEventListener("submit", function (e) {
        e.preventDefault();
        generate_events();
    });}

    if (eventBtn) {eventBtn.addEventListener("click", async () => {
        await confirm_events();
    });}

    if (nameForm) {nameForm.addEventListener("submit", function (e){
        e.preventDefault();
        confirm_names();
    });}

    function generate_events() {
        const eventNum = parseInt(document.getElementById("event_num").value);
        currentEventNum = eventNum; // save for later
        console.log(`Creating ${eventNum} events.`);

        event_container.innerHTML = "";

        for (let i = 1; i <= eventNum; i++) {
            const eventCard = document.createElement("div");
            eventCard.classList.add("event-card");

            const titleInput = document.createElement("input");
            titleInput.type = "text";
            titleInput.placeholder = `Event ${i} Title`;
            titleInput.id = `event_${i}_title`;

            const timeInput = document.createElement("input");
            timeInput.type = "text";
            timeInput.placeholder = `Event ${i} Time`;
            timeInput.id = `event_${i}_time`;

            const descInput = document.createElement("textarea");
            descInput.placeholder = `Event ${i} Description (optional)`;
            descInput.id = `event_${i}_description`;

            eventCard.appendChild(titleInput);
            eventCard.appendChild(document.createElement("br"));
            eventCard.appendChild(timeInput);
            eventCard.appendChild(document.createElement("br"));
            eventCard.appendChild(descInput);

            event_container.appendChild(eventCard);
        }
    }

    async function confirm_events() {
        for (let i = 1; i <= currentEventNum; i++) {
            const title = document.getElementById(`event_${i}_title`).value.trim();
            const time = document.getElementById(`event_${i}_time`).value.trim();
            const description = document.getElementById(`event_${i}_description`).value.trim();

            if (title === "" || time === "") continue;

            try {
                const eventRef = await db.collection("conferences")
                    .doc(selectedConferenceId)
                    .collection("events")
                    .add({
                        title,
                        time,
                        description,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                console.log(`Event ${i} saved under conference ${selectedConferenceId}`);
            } catch (err) {
                console.error(`Error saving event ${i}:`, err);
            }
        }

        alert("All valid events have been saved to Firestore.");
    }


    async function confirm_names(){
        const roles = [
            { id: "pam_names", role: "pre-arrival mentor" },
            { id: "coord_names", role: "nsm coordinator" },
            { id: "nso_names", role: "new student mentor" }
        ];
        const existingSnapshot = await db.collection("workers").get();
        const existingNamesSet = new Set();
        existingSnapshot.forEach(doc => {
            const name = doc.data().name?.toLowerCase().trim();
            if (name) existingNamesSet.add(name);
        });

        for (const { id, role } of roles) {
            const textarea = document.getElementById(id);
            if (!textarea) continue;

            const names = textarea.value
                .split("\n")
                .map(name => name.trim())
                .filter(name => name.length > 0);

            for (const name of names) {
                const normalized = name.toLowerCase();

                if (existingNamesSet.has(normalized)) {
                    console.warn(`Duplicate skipped: ${name}`);
                    continue;
                }

                try {
                    await db.collection("workers").add({
                        name,
                        role,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    console.log(`Saved: ${name} as ${role}`);
                } catch (err) {
                    console.error(`Failed to save ${name}:`, err);
                }
            }
        }

        alert("All workers submitted successfully!");
    }
    
    const roles = ["pre-arrival mentor", "nsm coordinator", "new student mentor"];
    const taskContainer = document.getElementById("task_container");

            if (taskContainer){
                initializeTaskCards()
            }
    async function initializeTaskCards() {
        const container = document.getElementById("task_container");
        if (!container) {
            console.warn("No #task_container found on this page.");
            return;
        }

        const conferenceId = localStorage.getItem("selectedConferenceId");
        if (!conferenceId) {
            alert("No conference selected. Please go back and select one.");
            return;
        }

        try {
            const eventsSnapshot = await db
                .collection("conferences")
                .doc(conferenceId)
                .collection("events")
                .orderBy("createdAt")
                .get();

            if (eventsSnapshot.empty) {
                container.innerHTML = "<p>No events found for this conference.</p>";
                return;
            }

            eventsSnapshot.forEach(doc => {
                const eventData = doc.data();
                const eventId = doc.id;
                const eventTitle = eventData.title || "Untitled Event";

                createEventTaskCard(eventId, eventTitle);
            });
        } catch (err) {
            console.error("Failed to initialize task cards:", err);
            container.innerHTML = "<p>Error loading tasks. See console.</p>";
        }
    }

    function createEventTaskCard(eventId, eventTitle) {
        const card = document.createElement("div");
        card.classList.add("event-task-card");
        card.setAttribute("data-event-id", eventId);

        const title = document.createElement("h3");
        title.textContent = eventTitle;
        card.appendChild(title);

        const taskList = document.createElement("div");
        taskList.classList.add("task-list");
        card.appendChild(taskList);

        const addTaskBtn = document.createElement("button");
        addTaskBtn.textContent = "Add Task";
        addTaskBtn.addEventListener("click", () => {
            const taskElement = createTaskElement();
            taskList.appendChild(taskElement);
        });
        card.appendChild(addTaskBtn);

        // DELETE EVENT BUTTON
        const deleteEventBtn = document.createElement("button");
        deleteEventBtn.textContent = "Delete Event";
        deleteEventBtn.style.backgroundColor = "darkred";
        deleteEventBtn.style.color = "white";
        deleteEventBtn.style.marginTop = "8px";
        deleteEventBtn.addEventListener("click", () => {
            deletedEventIds.add(eventId);
            card.remove();
        });
        card.appendChild(deleteEventBtn);

        taskContainer.appendChild(card);
        loadSavedTasks(eventId, taskList);
    }


    async function loadSavedTasks(eventId, taskList) {
        const conferenceId = localStorage.getItem("selectedConferenceId");
        const snapshot = await db.collection("conferences")
            .doc(conferenceId)
            .collection("events")
            .doc(eventId)
            .collection("tasks")
            .get();

        snapshot.forEach(doc => {
            const taskData = doc.data();
            const taskElement = createTaskElement(taskData, doc.id);
            taskList.appendChild(taskElement);
        });
    }

    function createTaskElement(taskData = {}, taskId = null) {
        const wrapper = document.createElement("div");
        wrapper.classList.add("task");

        if (taskId) {
            wrapper.setAttribute("data-task-id", taskId);
        }

        const desc = document.createElement("textarea");
        desc.placeholder = "Task description";
        desc.value = taskData.description || "";
        wrapper.appendChild(desc);

        const count = document.createElement("input");
        count.type = "number";
        count.min = "1";
        count.placeholder = "Required people";
        count.value = taskData.requiredCount || 1;
        wrapper.appendChild(count);

        roles.forEach(role => {
            const label = document.createElement("label");
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.value = role;
            if (taskData.roles?.includes(role)) checkbox.checked = true;

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(" " + role));
            wrapper.appendChild(label);
        });

        // DELETE BUTTON
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.classList.add("delete-task");
        deleteBtn.addEventListener("click", () => {
            const id = wrapper.getAttribute("data-task-id");
            if (id) deletedTaskIds.add(id); // Mark it for deletion
            wrapper.remove(); // Remove from DOM
        });
        wrapper.appendChild(deleteBtn);

        return wrapper;
    }


    async function loadWorkersByRole(roleId, roleName) {
        const textarea = document.getElementById(roleId);
        if (!textarea) return;

        const snapshot = await db.collection("workers")
            .where("role", "==", roleName)
            .get();

        const names = [];
        snapshot.forEach(doc => names.push(doc.data().name));
        textarea.value = names.join("\n");
    }

    // Calls:
    if (document.getElementById("pam_names")) loadWorkersByRole("pam_names", "pre-arrival mentor");
    if (document.getElementById("coord_names")) loadWorkersByRole("coord_names", "nsm coordinator");
    if (document.getElementById("nso_names")) loadWorkersByRole("nso_names", "new student mentor");



    function addTaskButton(taskList) {
        const btn = document.createElement("button");
        btn.textContent = "Add Task";
        btn.addEventListener("click", () => {
            const taskEl = createTaskElement();
            taskList.appendChild(taskEl);
        });
        return btn;
    }
    if (document.getElementById("save_tasks")) document.getElementById("save_tasks").addEventListener("click", () => {saveTasksToFirestore()});

    async function saveTasksToFirestore() {
        const cards = document.querySelectorAll(".event-task-card");
        

        for (const card of cards) {
            const eventId = card.getAttribute("data-event-id");
            if (deletedEventIds.has(eventId)) continue;
            const tasks = card.querySelectorAll(".task");
            

            for (const task of tasks) {
                const description = task.querySelector("textarea").value.trim();
                const selectedRoles = Array.from(task.querySelectorAll("input[type='checkbox']:checked"))
                    .map(cb => cb.value);
                const requiredCount = parseInt(task.querySelector("input[type='number']").value);
                const taskId = task.getAttribute("data-task-id");

                if (!description || selectedRoles.length === 0) continue;

                const taskRef = db.collection("conferences")
                    .doc(selectedConferenceId)
                    .collection("events")
                    .doc(eventId)
                    .collection("tasks");

                if (taskId) {
                    // Update existing task
                    await taskRef.doc(taskId).set({
                        description,
                        roles: selectedRoles,
                        requiredCount,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    // Add new task
                    const newDoc = await taskRef.add({
                        description,
                        roles: selectedRoles,
                        requiredCount,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    task.setAttribute("data-task-id", newDoc.id); // Save the new ID
                }
            }
        }

            // After saving/updating all tasks:
        // Delete tasks
        if (deletedTaskIds.size > 0) {
            for (const card of cards) {
                const eventId = card.getAttribute("data-event-id");
                for (const taskId of deletedTaskIds) {
                    await db.collection("conferences")
                        .doc(selectedConferenceId)
                        .collection("events")
                        .doc(eventId)
                        .collection("tasks")
                        .doc(taskId)
                        .delete();
                }
            }
            deletedTaskIds.clear();
        }

        // Delete events (and all their tasks)
        for (const eventId of deletedEventIds) {
            const tasksRef = db.collection("conferences")
                .doc(selectedConferenceId)
                .collection("events")
                .doc(eventId)
                .collection("tasks");

            const taskSnapshot = await tasksRef.get();
            for (const task of taskSnapshot.docs) {
                await task.ref.delete();
            }

            await db.collection("conferences")
                .doc(selectedConferenceId)
                .collection("events")
                .doc(eventId)
                .delete();
        }

        deletedEventIds.clear();


        alert("Tasks saved!");

    }






});
