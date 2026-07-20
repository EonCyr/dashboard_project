import json
import pandas as pd
import mysql.connector
import os

# Connect to database
conn = mysql.connector.connect(
    host=os.environ.get("DB_HOST", "db"),
    user=os.environ.get("DB_USER", "root"),
    password=os.environ.get("DB_PASSWORD", "password"),
    database=os.environ.get("DB_NAME", "dashboard_db")
)
cursor = conn.cursor()

# Load data
df = pd.read_excel("/app/data/student_data.xlsx")

def get_clean_val(val, default="Unknown"):
    return val if pd.notnull(val) else default

def format_date(val):
    if pd.isna(val):
        return '2000-01-01'
    try:
        return pd.to_datetime(val, dayfirst=True).strftime('%Y-%m-%d')
    except:
        return '2000-01-01'

for _, row in df.iterrows():
    raw_id = str(row.get('Student_ID'))
    clean_id_str = raw_id.lower().replace('student', '').strip()
    
    try:
        student_id = int(clean_id_str)
    except ValueError:
        print(f"Skipping invalid ID: {raw_id}")
        continue
    
    # 2. Upsert Student: This handles both inserting new and updating existing
    name = get_clean_val(row.get('Name'), "Unknown")
    age = get_clean_val(row.get('Age'), 0)
    current_band = get_clean_val(row.get('SummaryBand'), "N/A")
    date_of_enrollment = format_date(row.get('EnrollmentDate'))
    centre = get_clean_val(row.get('Centre_ID'), "Unknown")
    school = get_clean_val(row.get('School_ID'), "Unknown")
    
    cursor.execute("""
        INSERT INTO students (studentid, name, age, current_band, date_of_enrollment, centre, school) 
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            age = VALUES(age),
            current_band = VALUES(current_band),
            date_of_enrollment = VALUES(date_of_enrollment),
            centre = VALUES(centre),
            school = VALUES(school)
    """, (student_id, name, age, current_band, date_of_enrollment, centre, school))
    
    # 3. Insert/Handle Student Profile
    # Use IGNORE to avoid errors if the profile record already exists
    sch_level = get_clean_val(row.get('SchLevel'), "Unknown")
    months_to_48 = get_clean_val(row.get('No. of months to 48 months'), 0)
    cursor.execute("""
        INSERT IGNORE INTO student_profile (studentid, date_of_birth, school_level, months_to_48) 
        VALUES (%s, %s, %s, %s)
    """, (student_id, '2000-10-10', sch_level, months_to_48))


    # 3. Handle Therapist Creation (Ensuring no duplicates)
    teacher_id = row.get('Teacher_ID')
    if pd.notnull(teacher_id):
        pwd = 'pw123' # Default password for new therapist users
        try:
            therapist_userid = int(str(teacher_id).lower().replace('teacher', '').strip())
        except ValueError:
                therapist_userid = None

        if therapist_userid:
            # Check if therapist user entry already exists
            cursor.execute("SELECT userid FROM users WHERE userid = %s", (therapist_userid,))
            therapist_exists = cursor.fetchone()
            
            if not therapist_exists:
                # Create default user entry for the therapist
                cursor.execute("""
                    INSERT INTO users (userid, username, password, email, phone_number, role) 
                    VALUES (%s, %s, %s, %s, %s, 'therapist')
                """, (
                    therapist_userid, 
                    f"therapist_{therapist_userid}", 
                    pwd, 
                    f"therapist_{therapist_userid}@example.com", 
                    "0000000000"
                ))
                
                # Create corresponding therapist profile entry
                cursor.execute("""
                    INSERT INTO therapists (userid, centre) 
                    VALUES (%s, %s)
                """, (therapist_userid, centre))
            
            # 4. Link Student to Therapist in Junction Table
            cursor.execute("""
                INSERT IGNORE INTO therapist_student (studentid, therapistid) 
                VALUES (%s, %s)
            """, (student_id, therapist_userid))


    # Always insert the assessment record
    scores_dict = {
        "vocab": {
            "picture_naming": str(get_clean_val(row.get("Picture_Naming"), "N/A")),
            "picture_description": str(get_clean_val(row.get("Picture_Description"), "N/A")),
        },
        "pa/phonics": {
            "pa_identification": str(get_clean_val(row.get("PA_Identification"), "N/A")),
            "phonics": str(get_clean_val(row.get("Phonics"), "N/A")),
            "fluency": str(get_clean_val(row.get("FluencyMark"), "N/A")),
            "word_spelling": str(get_clean_val(row.get("Word_Spelling"), "N/A"))
        },
        "writing": {
            "Letter_Formation": str(get_clean_val(row.get("Letter_Formation"), "N/A")),
            "edit_d1": str(get_clean_val(row.get("Edit_D1"), "N/A")),
            "edit_d2": str(get_clean_val(row.get("Edit_D2"), "N/A")),
            "edit_d3": str(get_clean_val(row.get("Edit_D3"), "N/A")),
            "narrative_writing": str(get_clean_val(row.get("Narrative_Writing"), "N/A")),
            "exposition_writing": str(get_clean_val(row.get("Exposition_Writing"), "N/A")),
        },
        "listening/readingcomprehension": {
            "persuasive_writing": str(get_clean_val(row.get("Persuasive_Writing"), "N/A")),
            "listening_comprehension": str(get_clean_val(row.get("LS_Comprehension"), "N/A")),
            "reading_comprehension": str(get_clean_val(row.get("RD_Comprehension"), "N/A"))
        }
    }
    scores_json = json.dumps(scores_dict)
    sem = get_clean_val(row.get('Semester'), "Unknown")
    
    cursor.execute("""
        INSERT INTO assessments (studentid, semester, centre, scores, band) 
        VALUES (%s, %s, %s, %s, %s)
    """, (student_id, sem, centre, scores_json, current_band))

conn.commit()
cursor.close()
conn.close()