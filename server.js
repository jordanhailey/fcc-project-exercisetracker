const express = require('express')
const app = express()
const cors = require('cors')
const fs = require("fs");
const bodyParser = require('body-parser')
require('dotenv').config()

function createDateObjFromStr(yyyy=2021,mm=1,dd=1) {
  let date=new Date();date.setYear(yyyy);date.setMonth(mm-1);date.setDate(dd);date.setUTCHours(0,0,0,0);
  return date;
}

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
    const newUser = {"_id":id,username,"log":[]}
    users = [...users,newUser]
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
    let d,yyyy,mm,dd;
    if (/\d{4}-\d{2}-\d{2}/.test(date)) {
      yyyy = date.match(/^(\d{4})-\d{2}-\d{2}/)[1];
      mm = date.match(/^\d{4}-(\d{2})-\d{2}/)[1];
      dd = date.match(/^\d{4}-\d{2}-(\d{2})/)[1];
      d = createDateObjFromStr(yyyy,mm,dd)
    } else {
      d = date ? new Date(date) : new Date();
      yyyy = d.getFullYear();
      mm = zeroPad(d.getMonth()+1);
      dd = zeroPad(d.getDate());
    }
    date = d.toLocaleDateString(undefined,{weekday: 'short', year: 'numeric', month: 'short', day: '2-digit'}).replace(/,/g,"")
    let date_str = `${yyyy}-${mm}-${dd}`;
    const {users} = getDB();
    let user = users[_id];
    const newExercise = {description,duration:Number(duration),date,date_str}
    user.log = [...user.log,newExercise]
    try {
      writeDB({users})
      cb(null,{...user,logged:newExercise})
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
  const filtered = users.map((u,i)=>({_id:`${i}`,username:u.username}))
  res.json([...filtered])
});
app.use('/api/users',bodyParser.urlencoded({ extended: true }))
app.post('/api/users', async (req, res) => {
  const {username} = req.body;
  let _id; 
  await addUser(username,(err,res)=>{_id = err ? undefined : res});
  if (_id == undefined) console.error({error:"Unable to add user with the name: "+username})
  else res.json({_id,username})
});

app.use('/api/users/:_id/exercises',bodyParser.urlencoded({ extended: true }))

app.post('/api/users/:_id/exercises', async (req, res) => {
  let user;
  const {_id} = req.params
  await addExercise({_id,...req.body},(err,res)=>{user = err ? undefined : res})
  if (user == undefined) console.error({error:"Unable to complete request"})
  else {
    let {duration,date,description} = user.logged
    const actual = {username:user.username,description,duration,_id:user._id,date}
    res.json(actual)
  }
});

app.get('/api/users/:_id/logs', (req, res) => {
  const {from:f,to:t,limit:l} = req.query;
  const {users} = getDB();
  const user = users[req.params._id];
  if (!user) console.error({error:"unable to find user"})
  else {
    let {log=[]} = user;
    if (log.length && (f || t)) {
      let filteredLog = [];
      let [,fY,fM,fD] = f.match(/(\d{4})-(\d{2})-(\d{2})/);
      let [,tY,tM,tD] = t.match(/(\d{4})-(\d{2})-(\d{2})/);
      const fromT = createDateObjFromStr(fY,fM,fD) || null,
              toT = createDateObjFromStr(tY,tM,tD) || null;
      filteredLog = log.filter(logged => {
        let [,yyyy,mm,dd] = logged.date_str.match(/(\d{4})-(\d{2})-(\d{2})/);
        const event = createDateObjFromStr(yyyy,mm,dd);
        // console.log(fromT,toT,event,fromT<=event,toT>=event)
        if ((fromT && fromT > event) || (toT && toT < event)) return false;
        return logged
      })
      log = filteredLog;
    } 
    if (l !== undefined && log.length > l) log = log.slice(0,l);
    let count = log.length;
    res.json({log,count})
  }
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})