const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
app.post('/api/users', (req, res) => {
  res.json({message:`hello POST to /api/users`})
});
app.post('/api/users/:_id/exercises', (req, res) => {
  res.json({message:`hello POST to /api/users/${req.params._id}/exercises`})
});
app.get('/api/users/:_id/logs', (req, res) => {
  res.json({message:`hello GET at /api/users/${req.params._id}/logs`})
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
