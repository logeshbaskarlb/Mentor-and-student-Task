//Write API to create Mentor
//Write API to create Student
//Write API to Assign a student to Mentor
//Select one mentor and Add multiple Student
//A student who has a mentor should not be shown in List
//Write API to Assign or Change Mentor for particular Student
//Select One Student and Assign one Mentor
//Write API to show all students for a particular mentor
//Write an API to show the previously assigned mentor for a particular student.

const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv").config();
const URL = process.env.DB;

app.use(
  cors({
    origin: "*",
  })
);
const bodyParser = require("body-parser");
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send(`
  <div style="background-color:black; color:white;height:100%;">
    <h2 style=" text-align:center">
    Mentor and Student Assigning with Database
    </h2>
    <h4  style=" text-align:center">Here youu can see the assigned mentor ,students and mentor list ,student list
    </h4> 
    <h2  style=" text-align:center">By clicking the link given below</h2>
    <div style="display:flex; justify-content:center;padding:20px;"> 
    <div style=" padding:20px;"> 
    <p style="color:white;background-color:white; padding:10px 40px; margin:10px 20px; text-align:center ">
      <a href="/mentors" style="text-decoration:none;color:black;">
      All Mentors list
      </a>
    </p>
    <p style="color:white;background-color:white; padding:10px 5px; margin:10px 20px; text-align:center ">
    <a href="/all-student"  style="text-decoration:none;color:black;">
    All Students List
    </a>
    </p>
    <p style="color:white;background-color:white; padding:10px 5px; margin:10px 20px; text-align:center ">
    <a href="/students-without-mentors"  style="text-decoration:none;color:black;">
    Students Without Mentors
    </p>
    <p style="color:white;background-color:white; padding:10px 5px; margin:10px 20px; text-align:center ">
    <a href="/students-without-mentors"  style="text-decoration:none;color:black;">
    Student without mentor
    </a>
    </p>
    <p style="color:white;background-color:white; padding:10px 5px; margin:10px 20px; text-align:center ">
    <a href="/change-mentor"  style="text-decoration:none;color:black;">
    Changing mentor
    </a>
    </p>
    </div>
    </div>
    </div>
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
      students: [],
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
      oldMentor: null, // Add this line
      currentMentor: null, // Add this line
    };

    const connection = await MongoClient.connect(URL);
    const db = connection.db("mentorship");
    const result = await db.collection("students").insertOne(newStudent);
    await connection.close();
    res.json({
      Message: "Student created ",
      result: result,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ Message: "Error in creating the student" });
  }
});

//3) Write API to Assign a student to Mentor
//a) Select one mentor and Add multiple Student
app.post("/student-to-mentor", async (req, res) => {
  try {
    const { mentorId, studentId } = req.body;
    const mentorObjectId = new ObjectId(mentorId);
    const studentObjectId = new ObjectId(studentId);
    const connection = await MongoClient.connect(URL);
    const db = connection.db("mentorship");
    const mentorsCollection = db.collection("mentors");
    const studentsCollection = db.collection("student");
    const mentor = await mentorsCollection.findOne({ _id: mentorObjectId });
    const student = await studentsCollection.findOne({ _id: studentObjectId });
    if (!mentor || !student) {
      res.status(404).send({ error: "Mentor or student not found" });
      return;
    }


    // UPDATE PARTICULAR STUDENT
    await studentsCollection.updateOne(
      { _id: studentObjectId },
      {
        $set: {
          oldMentor: student.currentMentor,
          currentMentor: mentor.mentorName,
        },
      }
    );
    //ASSIGN MENTOR
    await mentorsCollection.updateOne(
      { _id: mentorObjectId },
      {
        $push: {
          students: {
            $each: [
              {
                studentName: student.studentName,
                studentEmail: student.studentEmail,
                studentId: studentObjectId,
              },
            ],
          },
        },
      }
    );

    connection.close();
    res.send({
      success: true,
      message: "Mentor will be assigned",
      mentorName: mentor.mentorName,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

//b) A student who has a mentor should not be shown in List
app.get("/students-without-mentors", async (req, res) => {
  try {
    const connection = await MongoClient.connect(URL);
    const db = connection.db("mentorship");
    const studentsData = await db
      .collection("students")
      .find({
        oldMentor: { $eq: null },
        currentMentor: { $eq: null },
      })
      .toArray();
    const students = studentsData.map((item) => ({
      studentId: item._id.toString(),
      studentName: item.studentName,
      studentEmail: item.studentEmail,
      oldMentor: item.oldMentor,
      currentMentor: item.currentMentor,
    }));
    connection.close();
    if (students.length > 0) {
      res.send(students);
    } else {
      res.send({
        message: "No students with both oldMentor and currentMentor found",
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

//4) API endpoint to assign or change mentor for a student
//Select One Student and Assign one Mentor

app.post("/change-mentor", async (req, res) => {
  try {
    const { mentorId, studentId, currentMentor, newCurrentMentor } = req.body;
    const mentorObjectId = new ObjectId(mentorId);
    const studentObjectId = new ObjectId(studentId);
    const connection = await MongoClient.connect(URL);
    const db = connection.db("mentorship");
    const mentorsCollection = db.collection("mentors");
    const studentsCollection = db.collection("students");
    const mentor = await mentorsCollection.findOne({ _id: mentorObjectId });
    const student = await studentsCollection.findOne({ _id: studentObjectId });
    if (!mentor || !student) {
      res.status(404).send({ error: "Mentor or student not found" });
      return;
    }
    await studentsCollection.updateOne(
      { _id: studentObjectId },
      {
        $set: {
          oldMentor: student.newCurrentMentor,
          currentMentor: newCurrentMentor,
        },
      }
    );

    await mentorsCollection.updateOne(
      { _id: mentorObjectId },
      {
        $push: {
          students: {
            studentName: student.studentName,
            studentEmail: student.studentEmail,
            studentId: studentObjectId,
          },
        },
      }
    );
    connection.close();
    res.send({
      success: true,
      message: "mentor will be changed for this student",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

//get all student
app.get("/all-student", async (req, res) => {
  try {
    const connection = await MongoClient.connect(URL);
    const db = connection.db("mentorship");
    const studentsData = await db.collection("student").find({}).toArray();
    const students = studentsData.map((item) => ({
      studentId: item._id.toString(),
      studentName: item.studentName,
      studentEmail: item.studentEmail,
      oldMentor: item.oldMentor,
      currentMentor: item.currentMentor,
    }));
    res.send(students);
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: error.message });
  }
});

// 5) Write API to show all students for a particular mentor

app.get("/:mentorName/student", async (req, res) => {
  try {
    const mentorName = req.params.mentorName;
    const connection = await MongoClient.connect(URL);
    const db = connection.db("mentorship");
    const mentorsData = db.collection("mentors");
    const mentor = await mentorsData.findOne({
      mentorName: mentorName,
    });

    if (!mentor) {
      res.status(404).send("Mentor not found");
      return;
    }

    res.send(mentor.students);
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
    if (!student || student.oldMentor === null) {
      res.json({
        message: "No mentor for student",
      });
    } else {
      res.json({
        oldmentor: student.oldMentor,
      });
    }
  } catch (error) {
    console.log(error);
  }
});
const port = 5000;
app.listen(port, () => {
  console.log(`App is running on http://localhost:${port}`);
});
