from flask import Flask, render_template, request, jsonify, session
import requests
import uuid
import json
import re

app = Flask(__name__)
app.secret_key = "eduadmit-secret-2025"

# ─────────────────────────────────────────────
#  LANGFLOW CONFIGURATION
# ─────────────────────────────────────────────
LANGFLOW_API_KEY = "sk-S2Pj_fVmKE60T8M--BqvUPq4Yv4mO5w8fHk3ZAX4zLI"
LANGFLOW_URL = "http://localhost:7860/api/v1/run/e6aac970-11fe-4ad2-a355-e435637ba1e0"


def query_langflow(user_message: str, session_id: str) -> str:
    payload = {
        "output_type": "chat",
        "input_type": "chat",
        "input_value": user_message,
        "session_id": session_id,
    }
    headers = {"x-api-key": LANGFLOW_API_KEY}
    try:
        response = requests.post(LANGFLOW_URL, json=payload, headers=headers, timeout=60)
        response.raise_for_status()
        data = response.json()

        # Parse Langflow response structure
        outputs = data.get("outputs", [])
        if outputs:
            inner = outputs[0].get("outputs", [])
            if inner:
                results = inner[0].get("results", {})
                msg = results.get("message", {})
                text = msg.get("text", "")
                if text:
                    return text

        # Fallback: search recursively for any 'text' field
        raw = json.dumps(data)
        matches = re.findall(r'"text"\s*:\s*"((?:[^"\\]|\\.)*)"', raw)
        if matches:
            best = max(matches, key=len)
            return best.replace("\\n", "\n").replace('\\"', '"')

        return "I received a response but couldn't parse it. Please try again."

    except requests.exceptions.ConnectionError:
        return "CONNECTION_ERROR: Unable to reach the LangFlow server. Please make sure LangFlow is running at localhost:7860."
    except requests.exceptions.Timeout:
        return "TIMEOUT_ERROR: The request took too long. Please try again."
    except requests.exceptions.HTTPError as e:
        return f"HTTP_ERROR: {e.response.status_code} - {e.response.text[:200]}"
    except Exception as e:
        return f"ERROR: {str(e)}"


@app.route("/")
def index():
    if "session_id" not in session:
        session["session_id"] = str(uuid.uuid4())
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_message = data.get("message", "").strip()
    if not user_message:
        return jsonify({"error": "Empty message"}), 400

    session_id = session.get("session_id", str(uuid.uuid4()))
    answer = query_langflow(user_message, session_id)
    return jsonify({"response": answer})


@app.route("/check-eligibility", methods=["POST"])
def check_eligibility():
    data = request.get_json()
    program = data.get("program", "")
    qualification = data.get("qualification", "")
    percentage = int(data.get("percentage", 0))
    entrance = data.get("entrance", [])

    result = {"status": "not_eligible", "icon": "❌", "title": "Not Eligible", "points": [], "message": ""}

    ug_quals = ["10+2 (PCM)", "10+2 (Commerce)", "10+2 (Arts)", "10+2 (Biology)", "10+2 (Any Stream)"]
    pg_quals = ["B.Tech / BE", "B.Sc / BCA", "B.Com / BBA", "BA / Other Graduation"]

    if program == "B.Tech":
        if qualification == "10+2 (PCM)":
            if percentage >= 60:
                has_entrance = any(e in entrance for e in ["JEE Main", "JEE Advanced", "CUET"])
                if has_entrance:
                    result = {"status": "eligible", "icon": "✅", "title": "Eligible for B.Tech!", "points": [
                        "✔ 10+2 with PCM background",
                        f"✔ {percentage}% meets the 60% minimum",
                        "✔ Valid entrance exam qualified"
                    ], "message": "Congratulations! You meet all requirements. Apply now!"}
                else:
                    result = {"status": "maybe", "icon": "⚠️", "title": "Conditionally Eligible", "points": [
                        "✔ 10+2 with PCM background",
                        f"✔ {percentage}% meets the 60% minimum",
                        "⚠ No entrance exam — management quota may apply"
                    ], "message": "You may qualify via management quota. JEE/CUET is recommended for merit seats."}
            else:
                result = {"status": "not_eligible", "icon": "❌", "title": "Not Eligible", "points": [
                    "✔ 10+2 with PCM background",
                    f"✘ {percentage}% is below the required 60%"
                ], "message": "Improve your academics or consider lateral entry options."}
        else:
            result = {"status": "not_eligible", "icon": "❌", "title": "Not Eligible", "points": [
                "✘ B.Tech requires 10+2 with Physics, Chemistry & Maths (PCM)"
            ], "message": "Please ensure you have PCM as your core subjects."}

    elif program == "MBA":
        if qualification in pg_quals:
            if percentage >= 50:
                has_entrance = any(e in entrance for e in ["CAT", "MAT", "NMAT", "XAT"])
                if has_entrance:
                    result = {"status": "eligible", "icon": "✅", "title": "Eligible for MBA!", "points": [
                        "✔ Graduation completed",
                        f"✔ {percentage}% meets the 50% minimum",
                        "✔ Management entrance exam qualified"
                    ], "message": "You are fully eligible! Strong entrance score may unlock scholarship."}
                else:
                    result = {"status": "maybe", "icon": "⚠️", "title": "Eligible (Entrance Recommended)", "points": [
                        "✔ Graduation completed",
                        f"✔ {percentage}% meets the 50% minimum",
                        "⚠ Consider CAT / MAT for merit-based admission"
                    ], "message": "You can apply, but a CAT/MAT score significantly improves your chances."}
            else:
                result = {"status": "not_eligible", "icon": "❌", "title": "Not Eligible", "points": [
                    "✔ Graduation completed",
                    f"✘ {percentage}% is below the required 50%"
                ], "message": "MBA requires a minimum 50% aggregate in graduation."}
        else:
            result = {"status": "not_eligible", "icon": "❌", "title": "Not Eligible", "points": [
                "✘ MBA requires a Bachelor's Degree in any stream"
            ], "message": "Complete your graduation first to be eligible for MBA."}

    elif program in ["B.Sc CS", "B.Com", "BCA"]:
        req_pct = 50 if program != "BCA" else 50
        if percentage >= req_pct:
            result = {"status": "eligible", "icon": "✅", "title": f"Eligible for {program}!", "points": [
                "✔ 10+2 completed",
                f"✔ {percentage}% meets the {req_pct}% minimum",
                "✔ No mandatory entrance exam required"
            ], "message": "Great! You can apply directly. Limited seats available — apply early."}
        else:
            result = {"status": "not_eligible", "icon": "❌", "title": "Not Eligible", "points": [
                "✔ 10+2 completed",
                f"✘ {percentage}% is below the required {req_pct}%"
            ], "message": f"{program} requires minimum {req_pct}% in 10+2."}

    elif program == "MCA":
        if qualification in pg_quals:
            if percentage >= 55:
                result = {"status": "eligible", "icon": "✅", "title": "Eligible for MCA!", "points": [
                    "✔ Graduation with Mathematics",
                    f"✔ {percentage}% meets the 55% minimum"
                ], "message": "You're eligible! MCA focuses on advanced computer applications and programming."}
            else:
                result = {"status": "not_eligible", "icon": "❌", "title": "Not Eligible", "points": [
                    "✔ Graduation completed",
                    f"✘ {percentage}% is below the required 55%"
                ], "message": "MCA requires 55% in graduation (preferably with Maths)."}
        else:
            result = {"status": "not_eligible", "icon": "❌", "title": "Not Eligible", "points": [
                "✘ MCA requires a Bachelor's Degree (B.Sc/BCA/B.Com with Maths)"
            ], "message": "Complete your graduation to apply for MCA."}

    elif program == "M.Tech":
        if qualification in ["B.Tech / BE"]:
            has_gate = "GATE" in entrance
            if percentage >= 60:
                result = {"status": "eligible" if has_gate else "maybe", "icon": "✅" if has_gate else "⚠️",
                          "title": "Eligible for M.Tech!" if has_gate else "Eligible (GATE Recommended)",
                          "points": [
                              "✔ B.Tech / BE completed",
                              f"✔ {percentage}% meets the 60% minimum",
                              "✔ GATE qualified — scholarship eligible" if has_gate else "⚠ GATE score strongly recommended"
                          ], "message": "GATE qualified candidates get stipend & priority admission." if has_gate else "Apply under general quota; GATE opens scholarship doors."}
            else:
                result = {"status": "not_eligible", "icon": "❌", "title": "Not Eligible", "points": [
                    "✔ B.Tech / BE completed",
                    f"✘ {percentage}% is below the required 60%"
                ], "message": "M.Tech requires minimum 60% in B.Tech/BE."}
        else:
            result = {"status": "not_eligible", "icon": "❌", "title": "Not Eligible", "points": [
                "✘ M.Tech requires B.Tech / BE in a relevant engineering branch"
            ], "message": "Complete your engineering graduation first."}

    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
