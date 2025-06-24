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
    events = new Map()

    eventForm.addEventListener("submit", function (e) {
        e.preventDefault();
        generate_events();
    });

    eventBtn.addEventListener("click", async () => {
        confirm_events()
    });

    function generate_events() {
        const eventNum = parseInt(document.getElementById("event_num").value);
        console.log(`Creating ${eventNum} events.`);

        const container = document.getElementById("event_container");
        container.innerHTML = ""; // Clear previous events

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
            eventCard.appendChild(descInput);

            container.appendChild(eventCard);
        }
    }



    function confirm_events() {
        for (let i = 1; i <= eventNum; i++) {
            events.set(`event_${i}_title`, document.getElementById(`event_${i}_title`).value)
            events.set(`event_${i}_time`, document.getElementById(`event_${i}_time`).value)
            events.set(`event_${i}_description`, document.getElementById(`event_${i}_description`).value)
        }

    }
});