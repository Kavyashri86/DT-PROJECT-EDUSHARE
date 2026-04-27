import pymysql

conn = pymysql.connect(host='localhost', user='root', password='Kavya@2505', database='edushare')
cursor = conn.cursor()

cursor.execute("""
    UPDATE resources
    SET image_url = CONCAT('/uploads/', image_url)
    WHERE image_url IS NOT NULL
      AND image_url != ''
      AND image_url NOT LIKE '/uploads/%'
""")
conn.commit()
print(f'Updated {cursor.rowcount} row(s)')

cursor.execute('SELECT name, image_url FROM resources')
for row in cursor.fetchall():
    print(f'  {row[0]} -> {row[1]}')

conn.close()
