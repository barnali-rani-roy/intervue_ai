from flask import Flask, render_template, request, jsonify, redirect, url_for, session
import uuid
import time
from flask_mysqldb import MySQL
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
import os
from dotenv import load_dotenv

app = Flask(__name__)
load_dotenv()

app.secret_key = os.getenv("SECRET_KEY")


# MySQL Configuration
app.config["MYSQL_HOST"] = "localhost"
app.config["MYSQL_USER"] = "root"
app.config["MYSQL_PASSWORD"] = os.getenv("MYSQL_PASSWORD", "")
app.config["MYSQL_DB"] = "intervue_ai"

mysql = MySQL(app)
# --------------------------------------------------
# Interview Tracks and Questions
# --------------------------------------------------

TRACKS = [
    {
        "key": "python",
        "label": "Python",
        "duration": 30,
        "difficulty": "Beginner"
    },
    {
        "key": "web",
        "label": "Web Development",
        "duration": 30,
        "difficulty": "Intermediate"
    },
    {
        "key": "sql",
        "label": "SQL & Databases",
        "duration": 30,
        "difficulty": "Intermediate"
    }
]

QUESTIONS = {

    # ==================================================
    # PYTHON — 5 QUESTIONS
    # ==================================================
    "python": [

        {
            "type": "theory",
            "question": "What is the difference between a list and a tuple in Python?",
            "answer": "A list is mutable, while a tuple is immutable.",
            "max_score": 10
        },

        {
            "type": "theory",
            "question": "What is the purpose of a function in Python?",
            "answer": "A function is a reusable block of code used to perform a specific task.",
            "max_score": 10
        },

        {
            "type": "coding",
            "question": "Write a Python program to check whether a number is even or odd.",
            "starter_code": "# Write your solution here\n",
            "max_score": 10
        },

        {
            "type": "theory",
            "question": "What is a dictionary in Python?",
            "answer": "A dictionary stores data in key-value pairs and is mutable.",
            "max_score": 10
        },

        {
            "type": "coding",
            "question": "Write a Python program to reverse a string.",
            "starter_code": "# Write your solution here\n",
            "max_score": 10
        }

    ],


    # ==================================================
    # WEB DEVELOPMENT — 5 QUESTIONS
    # ==================================================
    "web": [

        {
            "type": "theory",
            "question": "What is the difference between HTML, CSS, and JavaScript?",
            "answer": "HTML provides structure, CSS provides styling, and JavaScript provides behavior and interactivity.",
            "max_score": 10
        },

        {
            "type": "theory",
            "question": "What is the purpose of a responsive website?",
            "answer": "A responsive website adapts its layout and content to different screen sizes and devices.",
            "max_score": 10
        },

        {
            "type": "theory",
            "question": "What is semantic HTML?",
            "answer": "Semantic HTML uses meaningful HTML elements such as header, nav, section, article, and footer to describe the structure of content.",
            "max_score": 10
        },

        {
            "type": "coding",
            "question": "Write JavaScript code to display a message when a button is clicked.",
            "starter_code": "// Write your solution here\n",
            "max_score": 10
        },

        {
            "type": "coding",
            "question": "Write JavaScript code to validate that an input field is not empty.",
            "starter_code": "// Write your solution here\n",
            "max_score": 10
        }

    ],


    # ==================================================
    # SQL & DATABASES — 5 QUESTIONS
    # ==================================================
    "sql": [

        {
            "type": "theory",
            "question": "What is a primary key in a database?",
            "answer": "A primary key uniquely identifies each record in a table.",
            "max_score": 10
        },

        {
            "type": "theory",
            "question": "What is the difference between WHERE and HAVING in SQL?",
            "answer": "WHERE filters rows before grouping, while HAVING filters groups after GROUP BY.",
            "max_score": 10
        },

        {
            "type": "theory",
            "question": "What is an INNER JOIN in SQL?",
            "answer": "An INNER JOIN returns only the records that have matching values in both tables.",
            "max_score": 10
        },

        {
            "type": "coding",
            "question": "Write an SQL query to select all employees whose salary is greater than 50000.",
            "starter_code": "-- Write your SQL query here\n",
            "max_score": 10
        },

        {
            "type": "coding",
            "question": "Write an SQL query to find the average salary of all employees.",
            "starter_code": "-- Write your SQL query here\n",
            "max_score": 10
        }

    ]

}
# Stores active interview sessions
interviews = {}


# --------------------------------------------------
# Home Page
# --------------------------------------------------
def login_required(function):

    @wraps(function)
    def wrapper(*args, **kwargs):

        if "user_id" not in session:
            return redirect(url_for("login"))

        return function(*args, **kwargs)

    return wrapper
@app.route("/register", methods=["GET", "POST"])
def register():

    if request.method == "POST":

        name = request.form["name"]
        email = request.form["email"]
        password = request.form["password"]

        hashed_password = generate_password_hash(password)

        try:

            cursor = mysql.connection.cursor()

            cursor.execute(
                """
                INSERT INTO users (name, email, password, role)
    VALUES (%s, %s, %s, %s)
    """,
    (name, email, hashed_password, "candidate")
            )

            mysql.connection.commit()

            cursor.close()

            return redirect(url_for("login"))

        except Exception as e:

            return render_template(
                "register.html",
                error="Email already exists or registration failed."
            )

    return render_template("register.html")
@app.route("/login", methods=["GET", "POST"])
def login():

    if request.method == "POST":

        email = request.form["email"]
        password = request.form["password"]

        cursor = mysql.connection.cursor()

        cursor.execute(
    """
    SELECT id, name, email, password, role
    FROM users
    WHERE email=%s
    """,
    (email,)
)

        user = cursor.fetchone()

        cursor.close()

        if user and check_password_hash(user[3], password):

            session["user_id"] = user[0]
            session["user_name"] = user[1]
            session["user_email"] = user[2]
            session["role"] = user[4]

            if user[4] == "admin":
                return redirect(url_for("admin"))

            return redirect(url_for("home"))

        return render_template(
            "login.html",
            error="Invalid email or password."
        )

    return render_template("login.html")
@app.route("/logout")
def logout():

    session.clear()

    return redirect(url_for("login"))
@app.route("/")
def home():
    return render_template("index.html", tracks=TRACKS)


# --------------------------------------------------
# Start Interview
# --------------------------------------------------

@app.route("/start", methods=["POST"])
@login_required
def start_interview():

    track_key = request.form.get("track", "python")

    if track_key not in QUESTIONS:
        track_key = "python"

    interview_id = str(uuid.uuid4())

    interviews[interview_id] = {
    "track": track_key,
    "answers": [],
    "start_time": time.time(),
    "email_sent": False
}

    return redirect(
        url_for(
            "interview",
            interview_id=interview_id
        )
    )


# --------------------------------------------------
# Interview Page
# --------------------------------------------------

@app.route("/interview/<interview_id>")
@login_required
def interview(interview_id):

    interview_data = interviews.get(interview_id)

    if not interview_data:
        return redirect(url_for("home"))

    track_key = interview_data["track"]

    track = next(
        t for t in TRACKS
        if t["key"] == track_key
    )

    return render_template(
        "interview.html",
        interview_id=interview_id,
        track=track,
        total_questions=len(QUESTIONS[track_key])
    )


# --------------------------------------------------
# Send Question to JavaScript
# --------------------------------------------------

@app.route("/api/question/<interview_id>/<int:index>")
@login_required
def get_question(interview_id, index):

    interview_data = interviews.get(interview_id)

    if not interview_data:
        return jsonify({
            "error": "Interview not found"
        }), 404

    questions = QUESTIONS[interview_data["track"]]

    if index >= len(questions):
        return jsonify({
            "done": True
        })

    return jsonify({
        "done": False,
        "question": questions[index],
        "total": len(questions)
    })


# --------------------------------------------------
# Evaluate Answer
# --------------------------------------------------

@app.route("/api/submit", methods=["POST"])
@login_required
def submit_answer():

    data = request.get_json()

    interview_id = data.get("interview_id")
    index = data.get("index")
    answer = data.get("answer", "")
    time_taken = data.get("time_taken", 0)

    interview_data = interviews.get(interview_id)

    if not interview_data:
        return jsonify({
            "error": "Interview not found"
        }), 404

    questions = QUESTIONS[interview_data["track"]]
    question = questions[index]

    score = evaluate_answer(
        question,
        answer
    )

    feedback = generate_feedback(
        question,
        answer,
        score
    )

    result = {
        "question": question["question"],
        "answer": answer,
        "score": score,
        "max_score": question["max_score"],
        "feedback": feedback,
        "time_taken": time_taken,
        "type": question["type"]
    }

    interview_data["answers"].append(result)

    return jsonify({
        "score": score,
        "max_score": question["max_score"],
        "feedback": feedback
    })

# --------------------------------------------------
# Smart Answer Evaluation
# --------------------------------------------------

def evaluate_answer(question, answer):

    answer = answer.strip()

    if not answer:
        return 0

    if question["type"] == "coding":

        starter = question.get("starter_code", "").strip()

        if answer == starter:
            return 0

        code = answer.lower()

        useful_keywords = [
            "if",
            "else",
            "elif",
            "for",
            "while",
            "def",
            "return",
            "print",
            "input",
            "select",
            "from",
            "where",
            "function",
            "onclick",
            "addEventListener",
            "document",
            "querySelector"
        ]

        matched = sum(
            keyword in code
            for keyword in useful_keywords
        )

        length_score = min(len(answer) // 60, 3)

        total = matched + length_score

        if total >= 10:
            return 10

        elif total >= 8:
            return 9

        elif total >= 6:
            return 8

        elif total >= 5:
            return 7

        elif total >= 4:
            return 6

        elif total >= 3:
            return 5

        elif total >= 2:
            return 3

        return 0

    # ------------------------------------------
    # THEORY QUESTIONS
    # ------------------------------------------

    user_answer = answer.lower()
    expected_answer = question["answer"].lower()

    keywords = [
        word
        for word in expected_answer.split()
        if len(word) > 3
    ]

    matched = sum(
        word in user_answer
        for word in keywords
    )

    coverage = matched / max(len(keywords), 1)

    if coverage >= 0.90:
        return 10

    elif coverage >= 0.75:
        return 9

    elif coverage >= 0.60:
        return 8

    elif coverage >= 0.45:
        return 7

    elif coverage >= 0.30:
        return 5

    elif coverage >= 0.15:
        return 3

    return 0

# --------------------------------------------------
# Feedback Generator
# --------------------------------------------------

# --------------------------------------------------
# AI Feedback Generator
# --------------------------------------------------

def generate_feedback(question, answer, score):


    if not answer.strip():
        return "No answer was provided."

    starter = question.get("starter_code", "").strip()

    if question["type"] == "coding" and answer.strip() == starter:
        return "No answer was provided."

    if score >= 8:
        return "Excellent answer. You demonstrated a strong understanding of the concept."

    elif score >= 5:
        return "Good attempt. Your answer shows some understanding, but it could be more complete."

    return "Your answer needs improvement. Review the core concept and try to explain it with more clarity."


# --------------------------------------------------
# Results Page
# --------------------------------------------------

@app.route("/result/<interview_id>")
@login_required
def result(interview_id):

    interview_data = interviews.get(interview_id)

    if not interview_data:
        return redirect(url_for("home"))

    answers = interview_data["answers"]

    questions = QUESTIONS[interview_data["track"]]

# Add missing unanswered questions
    while len(answers) < len(questions):

        q = questions[len(answers)]

        answers.append({
            "question": q["question"],
            "answer": "",
            "score": 0,
            "max_score": q["max_score"],
            "feedback": "No answer was provided.",
            "time_taken": 0,
            "type": q["type"]
    })

    total_score = sum(a["score"] for a in answers)
    max_score = sum(a["max_score"] for a in answers)

    percentage = round(
        (total_score / max_score) * 100
    ) if max_score else 0

    passed = percentage >= 50

    # -------------------------------
    # Theory / Coding Scores
    # -------------------------------

    theory_answers = [
        a for a in answers
        if a["type"] == "theory"
    ]

    coding_answers = [
        a for a in answers
        if a["type"] == "coding"
    ]

    theory_pct = calculate_percentage(theory_answers)
    coding_pct = calculate_percentage(coding_answers)

    strengths = []
    weaknesses = []

    for answer in answers:

     if answer["score"] >= 8:

        if answer["type"] == "coding":
            strengths.append("Strong coding logic and problem solving")

        else:
            strengths.append("Good conceptual understanding")

     elif answer["score"] < 6:

        if answer["type"] == "coding":
            weaknesses.append("Practice coding problems regularly")

        else:
            weaknesses.append("Improve theoretical concepts")

# Remove duplicates
    strengths = sorted(set(strengths))
    weaknesses = sorted(set(weaknesses))

    answered_questions = sum(
    1
    for a in answers
    if a["answer"].strip()
)

    if answered_questions == len(answers):
        strengths.append("Completed all interview questions")

    if not weaknesses:
        weaknesses.append("Keep practising to maintain consistency")

    # -------------------------------
    # Time
    # -------------------------------

    total_seconds = sum(a["time_taken"] for a in answers)

    minutes = int(total_seconds // 60)
    seconds = int(total_seconds % 60)

    total_time = f"{minutes}m {seconds}s"

    # -------------------------------
    # Track Details
    # -------------------------------

    track = next(
        t for t in TRACKS
        if t["key"] == interview_data["track"]
    )

    track_label = track["label"]
    difficulty = track["difficulty"]

    # -------------------------------
    # Performance Level
    # -------------------------------

    if percentage >= 90:
        performance_level = "Excellent"

    elif percentage >= 75:
        performance_level = "Very Good"

    elif percentage >= 60:
        performance_level = "Good"

    elif percentage >= 40:
        performance_level = "Average"

    else:
        performance_level = "Beginner"

    # -------------------------------
    # Interview Date
    # -------------------------------

    interview_date = time.strftime("%d %B %Y")

    # =====================================================
    # Save Interview
    # =====================================================

    cursor = mysql.connection.cursor()

    cursor.execute(
        """
        INSERT INTO interviews
        (
            user_id,
            track,
            total_score,
            max_score,
            percentage,
            total_time,
            status
        )
        VALUES (%s,%s,%s,%s,%s,%s,%s)
        """,
        (
            session["user_id"],
            track_label,
            total_score,
            max_score,
            percentage,
            total_seconds,
            "Passed" if passed else "Failed"
        )
    )

    mysql.connection.commit()

    database_interview_id = cursor.lastrowid

    # =====================================================
    # Save Answers
    # =====================================================

    for answer in answers:

        cursor.execute(
            """
            INSERT INTO answers
            (
                interview_id,
                question,
                answer,
                score,
                max_score,
                feedback,
                time_taken,
                question_type
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            (
                database_interview_id,
                answer["question"],
                answer["answer"],
                answer["score"],
                answer["max_score"],
                answer["feedback"],
                answer["time_taken"],
                answer["type"]
            )
        )

    mysql.connection.commit()
    cursor.close()

    # =====================================================
    # Send Email Once
    # =====================================================

    if not interview_data["email_sent"]:

        try:

            send_result_email(
                recipient_email=session["user_email"],
                user_name=session["user_name"],
                track_label=track_label,
                percentage=percentage,
                total_score=total_score,
                max_score=max_score,
                strengths=strengths,
                weaknesses=weaknesses
            )

            interview_data["email_sent"] = True

        except Exception as e:
            print("Email Error:", e)

    # =====================================================
    # Render Page
    # =====================================================

    return render_template(
        "results.html",

        interview_id=database_interview_id,

        answers=answers,

        total_score=total_score,
        max_score=max_score,

        percentage=percentage,
        passed=passed,

        total_time=total_time,

        theory_pct=theory_pct,
        coding_pct=coding_pct,

        strengths=strengths,
        weaknesses=weaknesses,

        performance_level=performance_level,

        interview_role=track_label,
        difficulty=difficulty,
        interview_date=interview_date
    )
# --------------------------------------------------
# Calculate Skill Percentage
# --------------------------------------------------

def calculate_percentage(answers):

    if not answers:
        return None

    score = sum(
        a["score"]
        for a in answers
    )

    maximum = sum(
        a["max_score"]
        for a in answers
    )

    return round(
        (score / maximum) * 100
    )
def send_result_email(
    recipient_email,
    user_name,
    track_label,
    percentage,
    total_score,
    max_score,
    strengths,
    weaknesses
):

    sender_email = os.getenv("MAIL_USERNAME")
    sender_password = os.getenv("MAIL_PASSWORD")

    subject = "Your InterVue AI Interview Results"

    body = f"""
Hello {user_name},

Your {track_label} technical interview has been completed.

Overall Score: {percentage}%
Total Score: {total_score}/{max_score}

Strengths:
"""

    for strength in strengths:
        body += f"- {strength}\n"

    body += "\nAreas to Improve:\n"

    for weakness in weaknesses:
        body += f"- {weakness}\n"

    body += """

Thank you for using InterVue AI.

Best regards,
InterVue AI
"""

    message = MIMEMultipart()

    message["From"] = sender_email
    message["To"] = recipient_email
    message["Subject"] = subject

    message.attach(
        MIMEText(body, "plain")
    )

    with smtplib.SMTP("smtp.gmail.com", 587) as server:

        server.starttls()

        server.login(
            sender_email,
            sender_password
        )

        server.send_message(message)

@app.route("/admin")
@login_required
def admin():
    if session.get("role") != "admin":
        return redirect(url_for("home"))

    cursor = mysql.connection.cursor()

    # Total Users
    cursor.execute("SELECT COUNT(*) FROM users")
    total_users = cursor.fetchone()[0]

    # Total Interviews
    cursor.execute("SELECT COUNT(*) FROM interviews")
    total_interviews = cursor.fetchone()[0]

    # Passed Interviews
    cursor.execute("""
        SELECT COUNT(*)
        FROM interviews
        WHERE status='Passed'
    """)
    passed = cursor.fetchone()[0]

    # Failed Interviews
    cursor.execute("""
        SELECT COUNT(*)
        FROM interviews
        WHERE status='Failed'
    """)
    failed = cursor.fetchone()[0]

    # Recent Interviews
    cursor.execute("""
    SELECT
        interviews.id,
        users.name,
        users.email,
        interviews.track,
        interviews.percentage,
        interviews.status
    FROM interviews
    JOIN users
    ON users.id = interviews.user_id
    ORDER BY interviews.id DESC
    LIMIT 10
""")

    recent = cursor.fetchall()

    cursor.close()

    return render_template(
        "admin.html",
        total_users=total_users,
        total_interviews=total_interviews,
        passed=passed,
        failed=failed,
        recent=recent
    )

@app.route("/api/admin/stats")
@login_required
def admin_stats():

    cursor = mysql.connection.cursor()

    cursor.execute("SELECT COUNT(*) FROM users")
    users = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM interviews")
    interviews = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(*)
        FROM interviews
        WHERE status='Passed'
    """)
    passed = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(*)
        FROM interviews
        WHERE status='Failed'
    """)
    failed = cursor.fetchone()[0]

    cursor.close()

    return jsonify({
        "users": users,
        "interviews": interviews,
        "passed": passed,
        "failed": failed
    })
@app.route("/admin/interview/<int:interview_id>")
@login_required
def admin_interview_details(interview_id):

    if session.get("role") != "admin":
        return redirect(url_for("home"))

    cursor = mysql.connection.cursor()

    cursor.execute("""
        SELECT
            interviews.id,
            users.name,
            users.email,
            interviews.track,
            interviews.total_score,
            interviews.max_score,
            interviews.percentage,
            interviews.total_time,
            interviews.status
        FROM interviews
        JOIN users
        ON users.id = interviews.user_id
        WHERE interviews.id = %s
    """, (interview_id,))

    interview = cursor.fetchone()

    if not interview:

        cursor.close()

        return "Interview not found", 404


    cursor.execute("""
        SELECT
            question,
            answer,
            score,
            max_score,
            feedback,
            time_taken,
            question_type
        FROM answers
        WHERE interview_id = %s
        ORDER BY id ASC
    """, (interview_id,))

    answers = cursor.fetchall()

    cursor.close()


    return render_template(
        "admin_interview.html",

        interview=interview,

        answers=answers

    )
# --------------------------------------------------
# Run Application
# --------------------------------------------------


if __name__ == "__main__":
    app.run(
        debug=True
    )