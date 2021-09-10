class Client {
    constructor() {
        const canvas = document.querySelector('canvas')
        this.canvas = canvas
        this.message = document.querySelector('#message')
        this.rect = canvas.getBoundingClientRect()
        this.ctx = canvas.getContext('2d')
        this.START = false
        this.paths = {}
        this.init()
    }

    init() {
        this.initSocket()
        this.initCanvas()
    }

    initSocket() {
        const username = Math.random()
        // document.querySelector('body').innerHTML += username
        const url = location.host
        this.socket = io(url, { autoConnect: false })
        this.socket.auth = { username }

        this.socket.connect()



        this.socket.emit('join', 'room')

        this.socket.on('message', (data) => {
            console.log(data);
        })

        this.socket.on('joined', ({ room, paths }, id) => {
            console.log('加入房间：', { room, paths }, id);
            this.paths = paths
            this.initDraw()
        })

        this.socket.on('otherjoin', (data, id) => {
            console.log('游客加入：', data, id)
        })

        this.socket.on('full', (data) => {
            console.log(data);
        })

        this.socket.on('path', (path) => {
            this.draw(path)
        })

        this.socket.on('clear', () => {
            console.log('清屏')
            this.message.innerHTML += '清屏\n'
            this.paths = {}
            this.ctx.clearRect(0, 0, this.rect.width, this.rect.height)
        })
    }

    initCanvas() {
        // console.log(this.canvas)
        const {width, height} = this.rect
        this.canvas.width = width
        this.canvas.height = height
        this.canvas.addEventListener('mousedown', ({ clientX, clientY }) => {
            this.START = 
                `${crypto.getRandomValues(new Uint32Array(1)).join('')}-${width}-${height}`
            const x = clientX
            const y = clientY - this.rect.top
            this.ctx.beginPath(x, y)
            this.paths[this.START] = [[x, y]]
            this.socket.emit('path', {
                hash: this.START,
                path: [
                    x,
                    y]
            })
        })

        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.START) return
            const { clientX, clientY } = e
            console.log(clientX, clientY)
            const x = clientX
            const y = clientY - this.rect.top
            this.paths[this.START].push([x, y])
            this.socket.emit('path', {
                hash: this.START,
                path: [
                    x,
                    y]
            })
            this.ctx.lineTo(x, y)
            this.ctx.stroke()
        })

        this.canvas.addEventListener('mouseup', (e) => {
            this.START = false
        })
    }


    initDraw() {
        const { width, heigt } = this.rect

        this.ctx.clearRect(0, 0, width, heigt)
        for (const hash in this.paths) {
            
            this.paths[hash]
            .forEach((path, i) => {
                if (i === 0) {
                    this.ctx.beginPath()
                    this.ctx.moveTo(...this.transPosition(path, hash))
                } else {
                    this.ctx.lineTo(...this.transPosition(path, hash))
                    this.ctx.stroke()
                }
            })
        }
    }

    draw({ hash, path }) {
        // console.log('other draw', this.paths)
        if (!this.paths[hash]) this.paths[hash] = []
        else {
            const start =
                this.paths[hash][this.paths[hash].length - 1]
            this.ctx.beginPath()
            this.ctx.moveTo(...this.transPosition(start, hash))
            this.ctx.lineTo(...this.transPosition(path, hash))
            this.ctx.stroke()
        }
        this.paths[hash].push(path)
        // this.ctx.save()
    }

    clear() {
        this.socket.emit('clear')
    }

    transPosition([x, y], hash) {
        const [, width, height] = hash.split('-')
        return [
            x / width * this.rect.width,
            y / height * this.rect.height,
        ]
    }
}

const client = new Client()

document
    .querySelector('#clear')
    .addEventListener('click', () => {
        client.clear()
    })