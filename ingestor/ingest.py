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
    # 1. Clean the ID
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

    # 4. Always insert the assessment record
    scores_dict = {
        "vocab": str(get_clean_val(row.get("Picture_Naming"), "N/A")),
        "pa/phonics": str(get_clean_val(row.get("Phonics"), "N/A")),
        "writing": str(get_clean_val(row.get("Narrative_Writing"), "N/A")),
        "listening/readingcomprehension": str(get_clean_val(row.get("Word_Reading_Accuracy"), "N/A"))
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