const cluster = require("cluster");
const http = require("http");
const { Server } = require("socket.io");
// const redisAdapter = require("socket.io-redis");
const numCPUs = require("os").cpus().length;
const { setupMaster, setupWorker } = require("@socket.io/sticky");
const { createAdapter, setupPrimary } = require("@socket.io/cluster-adapter");
const path = require('path')
const express = require('express');
const app = express();
app.use(express.static(path.resolve(__dirname, 'public')))
const USERCOUNT = 10

let paths = {}

function clear() {
    paths = {}
    io.to('room').emit('clear')
}

setInterval(() => {
    clear()
}, 60000);

if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);

    const httpServer = http.createServer(app);
    setupMaster(httpServer, {
        loadBalancingMethod: "least-connection", // either "random", "round-robin" or "least-connection"
    });

    setupPrimary()

    httpServer.listen(3000);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on("exit", (worker) => {
        console.log(`Worker ${worker.process.pid} died`);
        cluster.fork();
    });
} else {
    console.log(`Worker ${process.pid} started`);

    const httpServer = http.createServer(app);
    const io = new Server(httpServer, {
        cors: {
            methods: ['GET', 'POST'],
            Credentials: true
        }
    });
    io.adapter(createAdapter())
    // io.adapter(redisAdapter({ host: "localhost", port: 6379 }));// 6379
    setupWorker(io);

    io.on("connection", (socket) => {
        socket.emit('message', '开始建立socktet')
        // socket.broadcast.emit('message', 'To(所有人)：游客加入')
        // socket.broadcast.to('game').emit('message', 'To(game)：游客加入')
        // 发送到所有客户端，包括发件人
        // io.sockets.emit('message', "this is a test");
        // 发送到“游戏”室（频道）中的所有客户端，包括发件人
        // io.sockets.in('game').emit('message', 'cool game');

        socket.on('join', async (room) => {
            socket.join(room)
            // const myRoom = io.sockets.adapter.rooms.get(room)
            // for(const [id, socket] of io.of('/').sockets) {
            //     console.log('id: ', id)
            // }
            const users = await io.in(room).allSockets()
            const roomCount = users.size
            // const users = myRoom ? Object.keys(myRoom.sockets).length : 0
            if (roomCount < USERCOUNT) {
                socket.emit('joined', { room, paths }, socket.id)
                if (roomCount > 1) {
                    socket
                        .to(room)
                        .emit('otherjoin', room, socket.id)
                }
            } else {
                socket
                    .leave(room)
                socket
                    .emit('full', room, socket.id)
            }
        })

        socket.on('path', (path) => {
            // console.log(path);
            if (!paths[path.hash]) paths[path.hash] = []
            paths[path.hash].push(path.path)
            // console.log(paths)
            socket
                .to('room')
                .emit('path', path)
        })

        socket.on('clear', () => {
            clear()
        })
    });
}