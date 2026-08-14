const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const filePath = path.join(__dirname, "books.json");

function sendResponse(res, statusCode, data) {
    res.writeHead(statusCode, {
        "Content-Type": "application/json"
    });
    res.end(JSON.stringify(data));
}

function readBooks(callback) {
    fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
            callback(err, null);
            return;
        }

        try {
            callback(null, JSON.parse(data));
        } catch (error) {
            callback(error, null);
        }
    });
}

function saveBooks(books, callback) {
    fs.writeFile(
        filePath,
        JSON.stringify(books, null, 2),
        "utf8",
        callback
    );
}

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    const method = req.method;

    if (method === "GET" && pathname === "/books") {
        readBooks((err, books) => {
            if (err) {
                sendResponse(res, 500, {
                    error: "Failed to read books file"
                });
                return;
            }

            sendResponse(res, 200, books);
        });
        return;
    }

    if (method === "POST" && pathname === "/books") {
        let body = "";

        req.on("data", chunk => {
            body += chunk.toString();
        });

        req.on("end", () => {
            let newBook;

            try {
                newBook = JSON.parse(body);
            } catch (error) {
                sendResponse(res, 400, {
                    error: "Invalid JSON"
                });
                return;
            }

            if (
                !newBook.title ||
                !newBook.author ||
                typeof newBook.price !== "number" ||
                typeof newBook.available !== "boolean"
            ) {
                sendResponse(res, 400, {
                    error: "Invalid book data"
                });
                return;
            }

            readBooks((err, books) => {
                if (err) {
                    sendResponse(res, 500, {
                        error: "Failed to read books file"
                    });
                    return;
                }

                const newId =
                    books.length === 0
                        ? 1
                        : Math.max(...books.map(book => book.id)) + 1;

                newBook.id = newId;
                books.push(newBook);

                saveBooks(books, err => {
                    if (err) {
                        sendResponse(res, 500, {
                            error: "Failed to save books"
                        });
                        return;
                    }

                    sendResponse(res, 201, newBook);
                });
            });
        });

        return;
    }

    if (method === "DELETE" && pathname.startsWith("/books/")) {
        const idText = pathname.split("/")[2];
        const id = Number(idText);

        if (!idText || !Number.isInteger(id)) {
            sendResponse(res, 404, {
                error: "Book not found"
            });
            return;
        }

        readBooks((err, books) => {
            if (err) {
                sendResponse(res, 500, {
                    error: "Failed to read books file"
                });
                return;
            }

            const bookIndex = books.findIndex(book => book.id === id);

            if (bookIndex === -1) {
                sendResponse(res, 404, {
                    error: "Book not found"
                });
                return;
            }

            const deletedBook = books.splice(bookIndex, 1)[0];

            saveBooks(books, err => {
                if (err) {
                    sendResponse(res, 500, {
                        error: "Failed to save books"
                    });
                    return;
                }

                sendResponse(res, 200, deletedBook);
            });
        });

        return;
    }

    sendResponse(res, 404, {
        error: "Invalid route"
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
