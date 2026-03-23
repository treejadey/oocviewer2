"use strict";

const turnTextIntoLinksInAStringAndAddToElement = (text, element) => {
    const urlRegex = /(?:http[s]?:\/\/.)?(?:www\.)?[-a-zA-Z0-9@%._\+~#=]{2,256}\.[a-z]{2,6}\b(?:[-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)/gi;
    let lastIndex = 0;

    text.replace(urlRegex, (match, offset) => {
        if (offset > lastIndex) {
            element.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
        }

        const anchor = document.createElement("a");

        anchor.setAttribute("target", "_blank");
        anchor.setAttribute("href", match);

        anchor.textContent = match;
        element.appendChild(anchor);

        lastIndex = offset + match.length;
    });

    if (lastIndex < text.length) {
        element.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
};

class Message extends HTMLElement {
    constructor() {
        super();

        this.attachShadow({ mode: "open" });
    }

    async connectedCallback() {
        const text = this.getAttribute("text");
        const id = this.getAttribute("id");
        const date = this.getAttribute("date");
        const addedBy = this.getAttribute("addedby")

        const dateObj = new Date(date);
        const dateTimeFormat = new Intl.DateTimeFormat("sv",
            { timeStyle: "short", dateStyle: "short" }
        );
        const dateText = dateTimeFormat.format(dateObj);

        const message = document.createElement("div");

        message.innerHTML = /*html*/`
            <div class="msg-id">#${id}</div>
            <time datetime="${date}">${dateText}</time>
        `

        let textDiv = document.createElement("div");
        textDiv.setAttribute("class", "msg-text");

        turnTextIntoLinksInAStringAndAddToElement(text, textDiv);

        message.append(textDiv)

        this.shadowRoot.append(message)
    }
}

class Messages extends HTMLElement {
    constructor() {
        super();

        this.attachShadow({ mode: "open" });
    }

    async connectedCallback() {
        const link = this.getAttribute("link");
        const textMessage = document.createElement("p");
        this.shadowRoot.append(textMessage)

        let data;
        try {
            textMessage.innerText = `Fetching the data from ${link}...`
            data = await (await fetch(link)).json();
        } catch (err) {
            textMessage.innerText = err.message;
        }

        if (data.currentId == null) {
            textMessage.innerText = "Couldn't find a currentId in the queried url. Is this a real link?"
        }

        if (data.messages == null) {
            textMessage.innerText = "Couldn't find the messages in the queried url. Is this a real link?"
        }

        const messages = document.createElement("ul")

        for (const msg of data.messages) {
            if (msg.id && msg.text && msg.date && msg.addedBy) {
                const li = document.createElement("li")

                const messageElement = document.createElement("ooc-message")
                messageElement.setAttribute("id", msg.id)
                messageElement.setAttribute("text", msg.text)
                messageElement.setAttribute("date", msg.date)
                messageElement.setAttribute("addedby", msg.addedBy)

                li.append(messageElement);

                messages.append(li);
            }
        }

        textMessage.remove()
        this.shadowRoot.append(messages)
    }
}

customElements.define("ooc-message", Message)
customElements.define("ooc-messages", Messages)

const urlParams = new URLSearchParams(window.location.search);

const q = urlParams.get("q");
const errorMessage = document.getElementById("errorMessage");

if (q == null || q === "") {
    errorMessage.innerText = "No query parameter is defined!"
}

let potentialUrl;
try {
    potentialUrl = new URL(q);
} catch (err) {

    if (err instanceof TypeError) {
        errorMessage.innerText =
            "Couldn't parse the q query parameter as a URL? Is it an actual url?"
    } else {
        errorMessage.innerText = err.message
    }

}

if (potentialUrl != null) {
    const main = document.getElementById("main")

    const messages = document.createElement("ooc-messages")
    messages.setAttribute("link", potentialUrl)

    main.appendChild(messages);
}
