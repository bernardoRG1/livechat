import express from 'express'
import { Server } from 'socket.io';
import {createServer} from 'node:http';
import logger from 'morgan';
import { Socket } from 'node:dgram';
import dotenv from 'dotenv';
import { createClient } from '@libsql/client';
import { url } from 'node:inspector';
dotenv.config()




const PORT = process.env.PORT ?? 1234; 
const app = express()
const server = createServer(app)
const io = new Server(server, {
   connectionStateRecovery : {
      
   }
})

const db = createClient({
   url :  "libsql://live-steel-serpent-bernardorg1.turso.io",
   authToken : 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOiIyMDIzLTEwLTIxVDIwOjIyOjQ0LjI4NzM3ODUzNVoiLCJpZCI6IjA4ZmI3YmI0LTcwNGQtMTFlZS05NGE4LWU2ZDkwMWQ1NWM3OCJ9.7IGmjQITxGvmCuwrcSPdjsv25xCxlPhNKi-j1DrHvUztb9vbk4PHzvwk8ZMsOUX1a3KtuuhpYu5dVma_HZYFCg',

});

await db.execute(`
   CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT
   )
`)

io.on('connection', async (s) => {
   console.log('an user has connected')
   s.on('disconnect', () => {
      console.log('an user has disconect')
   })

   s.on('chat message',async msg => {
   let result
   try {
      result = await db.execute({
         sql: 'INSERT INTO messages(content) VALUES (:msg)',
         args : {msg}
      })
   } catch (e) {
      console.error(e)
      return
   }
   io.emit('chat message', msg)
   })



   console.log('Auth: ', s.handshake.auth)

   if(!s.recovered) {
      try {
         const result = await db.execute({
            sql : 'SELECT id, content FROM messages where ID > ?',
            args : [0]
         })

         result.rows.forEach(row => {
            s.emit('chat message', row.content, row.id.toString())
         })
      } catch (e) {
         console.error(e)
         return
      }
   }
})


app.use(logger('dev')) 




app.get('/', (req,res) => {
   res.sendFile(process.cwd() + '/client/index.html')
})

server.listen(PORT, (req,res) => {
   console.log(`escuchando al servidor http://localhost:${PORT}`)
})