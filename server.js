const express = require('express')
const app = express()
const cors = require('cors')
const fs = require("fs");
const bodyParser = require('body-parser')
require('dotenv').config()

function getDB(){
  return JSON.parse(fs.readFileSync(__dirname+"/db.json",{encoding:"utf8"}));
}

function writeDB(db={"users":[]}){
  if (typeof db !== "object" || db == null || !Array.isArray(db.users)) throw new Error("database object is in improper shape. Must be an object containing a users property in the shape of an Array");
  else fs.writeFileSync(__dirname+"/db.json",JSON.stringify(db,null,2),{encoding:"utf8"});
}

function addUser(username="",cb=(err,res)=>{}) {
  if (typeof cb !== "function") throw new Error("Must provide callback function. cb args to be returned(error,response)");
  if (username == "") throw new Error("Unable to create user without a name.");
  else {
    let {users} = getDB();
    const id = users.length;
    users = [...users,{username,"logs":[]}]
    try {
      writeDB({users})
      cb(null,id);
    } catch (err) {
      cb(err);
    }
  }
}

function zeroPad(str){
  str = Number(str);
  if (str !== str || str < 0 ) throw new Error("NaN or negative")
  return str <= 9 ? `0${str}` : str;
}

function addExercise({_id=null,description="",duration=0,date=Date.now()},cb=(err,res)=>{}) {
  if (_id == null || !description || !duration) cb("fields cannot be blank",null)
  else {
    if (!date) {
      let d = new Date();
      let [yyyy,mm,dd] = [d.getFullYear(),zeroPad(d.getMonth()+1),zeroPad(d.getDate())];
      date = `${yyyy}-${mm}-${dd}`;
    };
    const {users} = getDB();
    let user = users[_id];
    user.logs = [...user.logs,{description,duration,date}]
    try {
      writeDB({users})
      cb(null,{...user})
    } catch (err) {
      cb(err,null)
    }
    ;
  }
}

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
app.get('/api/users', (req, res) => {
  const {users} = getDB();
  const filtered = users.map((u,i)=>({username:u.username,_id:i}))
  res.json([...filtered])
});
app.use('/api/users',bodyParser.urlencoded({ extended: true }))
app.post('/api/users', (req, res) => {
  const {username} = req.body;
  let _id; 
  addUser(username,(err,res)=>{_id = err ? undefined : res});
  if (_id == undefined) res.json({error:"Unable to add user with the name: "+username})
  res.json({username,_id})
});

app.use('/api/users/:_id/exercises',bodyParser.urlencoded({ extended: true }))
app.post('/api/users/:_id/exercises', (req, res) => {
  let user;
  const {_id} = req.params
  addExercise({_id,...req.body},(err,res)=>{user = err ? undefined : res})
  if (user == undefined) res.json({error:"Unable to complete request"})
  else res.json({...user})
});

app.get('/api/users/:_id/logs', (req, res) => {
  const {users} = getDB();
  const user = users[req.params._id];
  if (!user) res.json({error:"unable to find user"})
  let {logs} = user || [];
  let count = logs? logs.length : 0;
  res.json({user:user.username,logs,count})
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
