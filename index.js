const groceryList  = require('./groceryList')
const express = require('express')
const app = express();
const cors = require('cors');
const redis = require('redis')
let redis_host = "redis-11422.c62.us-east-1-4.ec2.cloud.redislabs.com"
let redis_port = 11422
let redis_password = "AFahzbIs3wTxs0VMPnvTqkuqyoZOWXwV"
var client = redis.createClient({
    socket:{
        host:redis_host,
        port:redis_port
    }
    ,password:redis_password
  });
app.use(express.json())
app.use(cors())
const PORT = process.env.PORT || 3000;
const allCategories = {"Housing": ["Mortgage,Rent", "Homeowners association (HOA fees)", "Homeowners insurance, Renters insurance", "Property insurance (i.e. jewelry)", "Home repairs, Maintenance", "Property taxes", "Home improvement", "Furnishings"],
"Home Services":["House cleaning", "Lawn care", "Security system", "Pest control"],"Utilities":["Natural gas,Electricity", "Landline, Home phone", "Mobile phone", "Home internet", "Garbage", "Recycling", "Water", "Sewer"],
"Household Items": ["Cleaning supplies", "Paper products", "Tools", "Toiletries", "Laundry supplies", "Postage", "Furniture", "Home décor", "Pool supplies"],
"Food": ["Groceries", "Restaurant", "Snacks"],"Transportation": ["Cab(Ola,Uber)", "Tolls","Parking Fees", "Car payment, lease payments", "Car insurance", "Fuel", "Maintenance, Repairs", "Registration", "Public transportation"],
"Medical,Health": ["Health insurance","Prescriptions, Medication", "Doctor bills", "Hospital bills", "Glasses, contacts"], "Subscriptions,Streaming Services": ["Netflix,Hulu",
"Amazon Prime", "Music (Spotify, Pandora)"],"Clothing": ["Work clothing", "Leisure clothing", "Dry cleaning", "Alterations"],
"Personal Care": ["Haircuts", "Hair coloring", "Hair products", "Cosmetics", "Grooming"],"Personal Development": ["Books", "Online courses"],"Recreation,Fun": ["Movies", "Concerts", "Hobbies,Crafts", "Hosting parties", "Books", "Entertainment", "Sporting Events"],
"Travel": ["Vacation", "Trips to see family"], "Technology": ["Mobile phone", "Computer, Computer accessories"]
}
app.get("/categories", async(req, res)=>{
    res.send(allCategories);
});
app.post("/createHome", async(req,res) => {
    await client.connect()
    let homeId = req.body.homeId;
    let homeString = await client.get('homes')
    if(homeString) {
        let homeJson = JSON.parse(homeString);
        if (homeJson.hasOwnProperty(homeId)){
            res.send({"Error": "homeId already exists!"});
        }
        else{
            homeJson[req.body.homeId] = {};
            await client.set("homes", JSON.stringify(homeJson))
            res.send({"Message": "home created successfully!"});
        }

    }
    else{
        let obj = {[req.body.homeId]:{}};
        await client.set("homes", JSON.stringify(obj))
        res.send({"Message": "home created successfully!"});
    }
    await client.disconnect()
});
app.post("/joinHome", async(req, res)=>{
    await client.connect()
    let homeId = req.body.homeId;
    let homeString = await client.get('homes')
    console.log(homeString);
    if(homeString) {
        let homeJson = JSON.parse(homeString);
        if (homeJson.hasOwnProperty(homeId)){
            res.send({"Message": "joined home successfully!"});
        }
        else{
            res.send({"Error": "home does not exists!"});
        }

    }
    await client.disconnect()
})
app.post("/saveExpense", async(req,res)=> {
    await client.connect()
    let payload = req.body;
    let homeId = payload.homeId;
    let homeString = await client.get('homes')
    if(homeString) {
        let homeJson = JSON.parse(homeString);
        let homeExpenses = homeJson[homeId];
        if(homeExpenses[payload.category]){
            if(homeExpenses[payload.category][payload.subCategory]){
                homeExpenses[payload.category][payload.subCategory].push({'expenseName': payload.expenseName, 'expenseValue': payload.expenseValue,'date': payload.date})
            }
            else{
                homeExpenses[payload.category][payload.subCategory] = [{'expenseName': payload.expenseName, 'expenseValue': payload.expenseValue,'date': payload.date}];
            }
        }
        else{
            homeExpenses[payload.category] = {};
            homeExpenses[payload.category][payload.subCategory] = [{'expenseName': payload.expenseName, 'expenseValue': payload.expenseValue,'date': payload.date}];
        }
        homeJson[homeId] = homeExpenses;
        console.log(JSON.stringify(homeJson));
        await client.set("homes", JSON.stringify(homeJson))
        res.send({"Message": "expense saved successfully!", "status": "success"});
    }
    await client.disconnect()
})
app.get("/clear", async(req,res)=> {
    await client.connect()
    await client.set("homes",JSON.stringify({}));
    res.send("ok")
    await client.disconnect();
})
app.post("/getCatExpense", async(req, res)=> {
    await client.connect()
    let homeString = await client.get('homes')
    let homeJson = JSON.parse(homeString);
    let homeData = homeJson[req.body.homeId];
    // console.log(homeData);
    // console.log(req.body);
    if(homeData.hasOwnProperty(req.body.category)){
    res.send(homeData[req.body.category])
    }
    await client.disconnect()

})
app.get("/groceryList", (req,res)=>{
res.send(groceryList);
});
app.post("/postReminder", async(req,res)=>{
    await client.connect()
    let homeString = await client.get('homes')
    let homeJson = JSON.parse(homeString);
    let homeData = homeJson[req.body.homeId];
    if(homeData.hasOwnProperty("Reminders")){
        homeData["Reminders"].push(req.body.reminder);
    }
    else{
        homeData["Reminders"] = [];
        homeData["Reminders"].push(req.body.reminder);
    }
    homeJson[req.body.homeId] = homeData;
    await client.set("homes", JSON.stringify(homeJson))
    res.send({"Message": "reminder saved successfully!", "status": "success"});
    await client.disconnect()
})

app.post("/updateReminder", async(req, res)=> {
    await client.connect()
    let homeString = await client.get('homes')
    let homeJson = JSON.parse(homeString);
    let homeData = homeJson[req.body.homeId];
    homeData["Reminders"] = req.body.reminders;
    homeData["miscReminder"] = req.body.miscReminders;
    homeJson[req.body.homeId] = homeData;
    await client.set("homes", JSON.stringify(homeJson));
    res.send({"Message": "reminder updated successfully!", "status": "success"});
    await client.disconnect()
})
app.post("/getReminders",async(req,res)=> {
    await client.connect()
    let homeString = await client.get('homes')
    let homeJson = JSON.parse(homeString);
    let homeData = homeJson[req.body.homeId];
    if(homeData.hasOwnProperty("Reminders") && homeData["Reminders"].length>0){
        if(homeData.hasOwnProperty("miscReminder") && homeData["miscReminder"].length>0){
            res.send({"Reminders": homeData["Reminders"], "miscReminders": homeData["miscReminder"]})
        }
        else
            res.send({"Reminders": homeData["Reminders"]})
    }
    else{
        res.send({"Message":"No Reminders", "status": "success"});
    }
    await client.disconnect();
})
app.post("/miscReminder", async(req,res)=>{
    await client.connect()
    let homeString = await client.get('homes')
    let homeJson = JSON.parse(homeString);
    let homeData = homeJson[req.body.homeId];
    if(homeData.hasOwnProperty("miscReminder")){
        homeData["miscReminder"].push(req.body.miscReminder);
    }
    else{
        homeData["miscReminder"] = [];
        homeData["miscReminder"].push(req.body.miscReminder);
    }
    homeJson[req.body.homeId] = homeData;
    await client.set("homes", JSON.stringify(homeJson));
    res.send({"Message": "Misc Reminder Set Successfully!", "status": "success"});
    await client.disconnect()
})
app.listen(PORT, () => {
    console.log("Server Listening on PORT:", PORT);
  });
