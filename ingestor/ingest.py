import pandas as pd
import mysql.connector
import os

conn = mysql.connector.connect(
    host=os.environ.get("DB_HOST"),
    user=os.environ.get("DB_USER"),
    password=os.environ.get("DB_PASSWORD"),
    database=os.environ.get("DB_NAME")
)

df = pd.read_excel("/app/data/student_data.xlsx")

required_columns = ['Centre_ID', 'Teacher_ID', 'Student_ID', 'School_ID', 'Age', 'SchLevel', 'EnrollmentDate', 'SummaryBand', 'Progress', 'NewBand', 'Picture_Naming', 'PN_Date', 'PN_Progress', 'Picture_Description', 'PD_Date', 'PD_Progress', 'PA_Identification', 'PI_Date', 'PI_Progress', 'Phonics', 'Phonics_Date', 'Phonics_Progress', 'Word_Reading_Accuracy', 'WRA_Date', 'WRA_Progress', 'FluencyMark', 'Progress1', 'Word_Spelling', 'WS_Date', 'WS_Progress', 'Letter_Formation', 'LF_Date', 'LF_Progress', 'Edit_D1', 'ED1_Date', 'ED1_Progress', 'Edit_D2', 'ED2_Date', 'ED2_Progress', 'Edit_D3', 'ED3_Date', 'ED3_Progress', 'Narrative_Writing', 'NW_Date', 'NW_Progress', 'Exposition_Writing', 'EW_Date', 'EW_Progress', 'Persuasive_Writing', 'PW_Date', 'PW_Progress', 'No. of months to 48 months']

df_cleaned = df[required_columns].where(pd.notnull(df), None)

cursor = conn.cursor()

for _, row in df_cleaned.iterrows():
    sql = "INSERT IGNORE INTO students (name, student_id, age, band, progress, parent_username) VALUES (%s, %s, %s, %s, %s, %s)"
    cursor.execute(sql, (row['name'], row['student_id'], row['age'], row['band'], row['progress'], row['parent_username']))
    
conn.commit()
cursor.close()
conn.close()
