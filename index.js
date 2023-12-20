//Write API to create Mentor
//Write API to create Student
//Write API to Assign a student to Mentor
//Select one mentor and Add multiple Student
//A student who has a mentor should not be shown in List
//Write API to Assign or Change Mentor for particular Student
//Select One Student and Assign one Mentor
//Write API to show all students for a particular mentor
//Write an API to show the previously assigned mentor for a particular student.
//

const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const app = express();
require("dotenv").config();
const URL = process.env.DB;
const cors = require("cors");
app.use(
  cors({
    origin: "*",  
  })
);
const bodyParser = require("body-parser");
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send(`
    <h2 style=" align-item: center ">Mentor and Student Assigning with Database</h2>
    `);
});

//to get mentors
app.get("/mentors", async (req, res) => {
  try {
    const connection = await MongoClient.connect(URL);
    const db = connection.db("mentorship");
    const mentors = await db.collection("mentors").find({}).toArray();
    await connection.close();
    res.send(mentors);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      Message: "Something went wrong",
    });
  }
});

// 1)to add or create mentor
app.post("/mentor", async (req, res) => {
  try {
    const { mentorName, mentorEmail } = req.body;
    const connection = await MongoClient.connect(URL);
    const db = connection.db("mentorship");
    const mentor = await db.collection("mentors").insertOne({
      mentorName: mentorName,
      mentorEmail: mentorEmail,
    });
    await connection.close();
    res.send({
      message: "Mentor created",
      mentor: mentor,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
});

//to get students
app.get("/students", async (req, res) => {
  try {
    const connection = await MongoClient.connect(URL);
    const db = connection.db("mentorship");
    const students = await db.collection("student").find().toArray();
    await connection.close();
    res.json(students);
  } catch (error) {
    console.log(error);
    res.status(500).json({ Message: "Error in fetching Students" });
  }
});

//2) to add or create students
app.post("/student", async (req, res) => {
  try {
    const { studentName, studentEmail } = req.body;
    const newStudent = {
      studentName: studentName,
      studentEmail: studentEmail,
      oldmentor: null,
      currentMentor: null,
    };
    const connection = await MongoClient.connect(URL);
    const db = connection.db("mentorship");
    const student = await db.collection("student").insertOne(newStudent);
    await connection.close();
    res.json({
      Message: "Student created ",
      student: student,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ Message: "Error in creating the student" });
  }
});

//3) Write API to Assign a student to Mentor
//a) Select one mentor and Add multiple Student
app.post("/assign", async (req, res) => {
  try {
    const { mentorId, studentId } = req.body;
    const mentorObjectId = new ObjectId(mentorId);
    const studentObjectId = new ObjectId(studentId);
    const connection = await MongoClient.connect(URL);
    const db = connection.db("mentorship");
    const mentorCollection = db.collection("mentors");
    const studentCollection = db.collection("student");
    const mentor = await mentorCollection.findOne({
      _id: mentorObjectId,
    });
    const student = await studentCollection.findOne({
      _id: studentObjectId,
    });

    // Update student
    await studentCollection.updateOne(
      { _id: studentObjectId },
      { $set: { oldmentor: mentor.currentMentor, currentMentor: student.mentorName } }
    );

    // Update mentor's students array
    await mentorCollection.updateOne(
      { _id: mentorObjectId },
      { $addToSet: { students: studentObjectId } }
    );

    res.status(200).json({ message: "Student assigned to mentor successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error in assigning student to mentor" });
  }
});


//b) A student who has a mentor should not be shown in List
app.get("/students-without-mentors", async (req, res) => {
  let mentorId = req.params.mentorId;
  try {
    const connection = await MongoClient.connect(URL);
    const db = connection.db("mentorship");
    const availableStudents = availableStudents(
      connection.db("mentorship"),
      mentorId
    );
    res.send(availableStudents);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

//4) API endpoint to assign or change mentor for a student
//Select One Student and Assign one Mentor

app.put("/", async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const { mentorId } = req.body;
    const connection = await MongoClient.connect(URL);
    const db = connection.db("mentorship");
    const result = await db.collection("mentors").updateOne(
      { _id: new ObjectId(mentorId) }, // The query to find the document
      { $addToSet: { students: new ObjectId(studentId) } } //The update operation
    );
    if (result.modifiedCount === 0) {
      return res.status(404).json({
        message: "Student not found",
      });
    }
    res.status(200).json({
      message: "Mentor assigned to student successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// 5) Write API to show all students for a particular mentor

app.get(":mentorName/students", async (req, res) => {
  try {
    const mentorName = req.params.mentorName;
    const connection = await MongoClient.connect(URL);
    const db = connection.db("mentorship");
    const mentorsData = db.collection("mentors");
    const mentor = await mentorsData.findOne({
      mentorName: mentorName,
    });
    res.json(mentor.students);
  } catch (error) {
    console.log(error);
  }
});

// 6) Write API to show the previously assigned mentor for a particular student

app.get("/oldmentor/:studentName", async (req, res) => {
  try {
    const { studentName } = req.body;
    const connection = await MongoClient.connect(URL);
    const db = connection.db("mentorship");
    const studentData = db.collection("student");
    const student = await studentData.findOne({
      studentName: studentName,
    });
    if (student.oldmentor === null) {
      res.json({
        message: "No mentor for student",
      });
    } else {
      res.json({
        oldmentor: student.oldmentor,
      });
    }
  } catch (error) {
    console.log(error);
  }
});
const port =  5000;
app.listen(port, () =>{
console.log(`App is running on http://localhost:${port}`)
console.log("heloo buddy!")
});

// c2hngCZFaAyFRO2n
