import * as http from "http";
import * as url from "url";
import * as fs from "fs";
import { v4 as uuid } from "uuid";

let filedata = "./data.json";
let data = {};
const PORT = 5050;

function saveData() {
    fs.writeFileSync(filedata, JSON.stringify(data), "utf8");
}

function loadData() {
    if (fs.existsSync(filedata)) {
        let afterData = fs.readFileSync(filedata, "utf8");
        data = JSON.parse(afterData);
    }
}

const sendResponse = (res, statusCode, data) => {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
};

function isNum(val) {
    return typeof val === "number" && !isNaN(val);
}

function isString(val) {
    return typeof val === "string";
}

function validateData(data) {
    const { name, age, Country } = data;

    if (!isString(name)) {
        return { valid: false, message: "Invalid name" };
    }
    if (!isNum(age)) {
        return { valid: false, message: "Invalid age" };
    }
    if (!isString(Country)) {
        return { valid: false, message: "Invalid country" };
    }
    return { valid: true };
}

function applyFiltersAndSort(query) {
    let filteredData = Object.values(data);

    if (query.name) {
        filteredData = filteredData.filter(item =>
            item.name.toLowerCase().includes(query.name.toLowerCase())
        );
    }

    if (query.age) {
        filteredData = filteredData.filter(item =>
            item.age ===parseInt(query.age)
        );
    }

    if (query.Country) {
        filteredData = filteredData.filter(item =>
            item.Country.toLowerCase().includes(query.Country.toLowerCase())
        );
    }

    if (query.sort === "age") {
        filteredData.sort((a, b) => a.age - b.age);
    }

    return filteredData;
}

function handleCreate(req, res) {
    let body = "";
    req.on("data", (chunks) => {
        body += chunks.toString();
    });
    req.on("end", () => {
        try {
            const newData = JSON.parse(body);
            const valData = validateData(newData);
            if (!valData.valid) {
                return sendResponse(res, 400, { message: valData.message });
            }
            const id = uuid();
            data[id] = newData;
            saveData();
            sendResponse(res, 201, { id, ...newData });
        } catch (err) {
            return sendResponse(res, 400, { message: "Invalid JSON format" });
        }
    });
}

function handleGet(req, res) {
    const { query } = url.parse(req.url, true);
    const id = query.id;
    if (id && data[id]) {
        sendResponse(res, 200, data[id]);
    } else {
        const result = applyFiltersAndSort(query);
        sendResponse(res, 200, result);
    }
}

function handleUpdate(req, res) {
    const { query } = url.parse(req.url, true);
    const id = query.id;

    if (!id) {
        return sendResponse(res, 400, { message: "ID is required" });
    } else if (id && !data[id]) {
        return sendResponse(res, 404, { message: "You should enter a valid ID" });
    }

    let body = "";
    req.on("data", (chunks) => {
        body += chunks.toString();
    });
    req.on("end", () => {
        try {
            const newData = JSON.parse(body);
            const valData = validateData(newData);
            if (!valData.valid) {
                return sendResponse(res, 400, { message: valData.message });
            }
            data[id] = { ...data[id], ...newData };
            saveData();
            sendResponse(res, 200, data[id]);
        } catch (err) {
            return sendResponse(res, 400, { message: "Invalid JSON" });
        }
    });
}

function handleDelete(req, res) {
    const { query } = url.parse(req.url, true);
    const id = query.id;

    if (!id) {
        return sendResponse(res, 400, { message: "ID is required" });
    } else if (id && !data[id]) {
        return sendResponse(res, 404, { message: "You should enter a valid ID" });
    }

    delete data[id];
    saveData();
    sendResponse(res, 200, { message: "User deleted successfully" });
}

loadData();

const server = http.createServer((req, res) => {
    const requrl = url.parse(req.url, true);
    const method = req.method;

    switch (requrl.pathname) {
        case "/create":
            if (method === "POST") {
                handleCreate(req, res);
            } else {
                sendResponse(res, 405, { message: "Method Not Allowed" });
            }
            break;
        case "/list":
            if (method === "GET") {
                handleGet(req, res);
            } else {
                sendResponse(res, 405, { message: "Method Not Allowed" });
            }
            break;
        case "/update":
            if (method === "PUT") {
                handleUpdate(req, res);
            } else {
                sendResponse(res, 405, { message: "Method Not Allowed" });
            }
            break;
        case "/delete":
            if (method === "DELETE") {
                handleDelete(req, res);
            } else {
                sendResponse(res, 405, { message: "Method Not Allowed" });
            }
            break;
        default:
            sendResponse(res, 404, { message: "Not Found" });
            break;
    }
});

server.listen(PORT, () => {
    console.log("Server started on port " + PORT);
});
