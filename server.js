const path = require('path')
const express = require('express');
const app = express();
const socketIO = require('socket.io')
app
    // .use(require('helmet').contentSecurityPolicy({
    //     useDefaults: true,
    //     directives: {
    //         'script-src': ['self', 'cdn.jsdelivr.net', 'unpkg.com']
    //     }
    // }))
    .use(require('helmet')({ contentSecurityPolicy: false, }))
    .use(express.static(path.join(__dirname, 'public')))
const server = require('http').createServer(app);
const io = socketIO(server, {
    cors: {
        methods: ['GET', 'POST'],
        Credentials: true
    }
});
const USERCOUNT = 10


let paths = {}
let clients = new Set

function clear() {
    paths = {}
    io.to('room').emit('clear')
}

setInterval(() => {
    clear()
}, 60000);
io.use((socket, next) => {
    // const username = socket.handshake.auth.username
    const { username, visitorId } = socket.handshake.auth
    // if (!username) {
    //     return next(new Error('invalid username'))
    // }
    socket.username = username
    socket.visitorId = visitorId
    next()
})

io.on('connection', (socket) => {
    // 前端生成用户画像，使唯一
    // const { username, visitorId } = socket
    // clients.forEach(({ visitorId: _visitorId }) => {
    //     console.log(_visitorId === visitorId)
    //     if (_visitorId === visitorId) {
    //         socket.emit('connectioned')
    //     }
    // })
    // clients.add(socket)

    socket.emit('message', '开始建立socktet', socket.id)
    // socket.broadcast.emit('message', 'To(所有人)：游客加入')
    // socket.broadcast.to('game').emit('message', 'To(game)：游客加入')
    // 发送到所有客户端，包括发件人
    // io.sockets.emit('message', "this is a test");
    // 发送到“游戏”室（频道）中的所有客户端，包括发件人
    // io.sockets.in('game').emit('message', 'cool game');
    socket.on('disconnect', () => {
        // console.log('Client disconnected')
        // socket.emit('disconnected')
        socket.to(socket.room).emit('disconnected', socket.id)
        clients.delete(socket)
    });
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
            socket.room = room
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

    socket.on('message', (data) => {
        socket.to('room').emit('message', data, socket.id)
    })

    socket.on('clear', () => {
        clear()
    })
})

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`server work ${PORT}`);
});