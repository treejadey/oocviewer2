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
        message.setAttribute("class", "msg")

        const msgIdDiv = document.createElement("div")
        msgIdDiv.setAttribute("class", "msg-id");
        msgIdDiv.innerText = `#${id}`;

        const timeElement = document.createElement("time")
        timeElement.setAttribute("datetime", date)
        timeElement.innerText = dateText

        const metadataDiv = document.createElement("div")
        metadataDiv.setAttribute("class", "msg-metadata")
        metadataDiv.append(msgIdDiv, timeElement)

        message.append(metadataDiv)

        let textParagraph = document.createElement("p");
        textParagraph.setAttribute("class", "msg-text");

        turnTextIntoLinksInAStringAndAddToElement(text, textParagraph);

        message.append(textParagraph)

        const addedByDiv = document.createElement("div");
        addedByDiv.setAttribute("class", "msg-addedby");

        const adder = document.createElement("span")
        adder.setAttribute("class", "adder-name")
        adder.appendChild(document.createTextNode(addedBy))

        const addPlaceholder = document.createElement("span")
        addPlaceholder.innerText = "Added by: "

        addedByDiv.append(addPlaceholder, adder)

        message.append(addedByDiv)

        const styles = document.createElement("style");

        styles.innerText = /*css*/`
        .msg {
            background-color: light-dark(#f5f5f5, #293141);
            padding: 0.75rem;
            overflow-wrap: break-word;
        }

        .msg-metadata {
            font-size: 13px;
            font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace;
            color: light-dark(#596b9e, #9096a1);
        }

        .msg-id, time {
            display: inline;
            margin-right: 6px;
        }
        
        .msg-text {
            display: inline;
            color: light-dark(#243360, #d5d5d5);
            font-size: 16px;
        }

        .msg-addedby {
            display: block;
            margin-top: 4px;
            color: light-dark(#596b9e, #9096a1);
            font-size: 12px;
        }
        
        .adder-name {
            color: light-dark(#3f5696, #9fa3b7);
            font-weight: 600;
        }
        
        `
        this.shadowRoot.append(styles)
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

        const styles = document.createElement("style");

        styles.innerText = `
        ul {
            padding-left: 0;

            display: flex;
            flex-direction: column-reverse;
            gap: 0.5rem;
        }

        ul li {
            list-style: none;
        }
        `
        this.shadowRoot.append(styles)

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
    errorMessage.innerText = "No query parameter is defined!\n Add ?q=[link to a raw hastebin with ooc messages] to the end of the url."
} else {
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

}

