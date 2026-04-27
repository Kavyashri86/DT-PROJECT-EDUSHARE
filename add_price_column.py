import pymysql

conn = pymysql.connect(host='localhost', user='root', password='Kavya@2505', database='edushare')
cursor = conn.cursor()

# Add price column if not exists
try:
    cursor.execute("ALTER TABLE resources ADD COLUMN price VARCHAR(20) NULL")
    conn.commit()
    print("price column added")
except pymysql.err.OperationalError as e:
    if "Duplicate column" in str(e):
        print("price column already exists")
    else:
        raise

cursor.execute("DESCRIBE resources")
for row in cursor.fetchall():
    print(f"  {row[0]:20} {row[1]}")

conn.close()
