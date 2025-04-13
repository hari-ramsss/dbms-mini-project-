from flask import Flask, render_template, request, jsonify
import sqlite3
from datetime import datetime, date

app = Flask(__name__, static_folder='../frontend', static_url_path='')

DATABASE = 'emall.db'

# Helper function to get database connection
def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

# Initialize database tables
def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if maintenance table needs to be updated
    cursor.execute('PRAGMA table_info(maintenance)')
    columns = cursor.fetchall()
    column_names = [column['name'] for column in columns]
    
    # If resolved_date and resolution_notes are missing, alter the table
    if 'resolved_date' not in column_names:
        cursor.execute('ALTER TABLE maintenance ADD COLUMN resolved_date TEXT')
    
    if 'resolution_notes' not in column_names:
        cursor.execute('ALTER TABLE maintenance ADD COLUMN resolution_notes TEXT')
    
    # Create tables
    cursor.executescript('''
    CREATE TABLE IF NOT EXISTS shop (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        location TEXT,
        size REAL,
        rent REAL,
        status TEXT DEFAULT 'Vacant'
    );
    
    CREATE TABLE IF NOT EXISTS tenant (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact TEXT,
        email TEXT,
        business_type TEXT,
        shop_id INTEGER,
        FOREIGN KEY (shop_id) REFERENCES shop (id)
    );
    
    CREATE TABLE IF NOT EXISTS lease (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL,
        shop_id INTEGER NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        rent_amount REAL NOT NULL,
        status TEXT DEFAULT 'Active',
        FOREIGN KEY (tenant_id) REFERENCES tenant (id),
        FOREIGN KEY (shop_id) REFERENCES shop (id)
    );
    
    CREATE TABLE IF NOT EXISTS maintenance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shop_id INTEGER NOT NULL,
        description TEXT NOT NULL,
        reported_date TEXT,
        status TEXT DEFAULT 'Pending',
        priority TEXT DEFAULT 'Medium',
        resolved_date TEXT,
        resolution_notes TEXT,
        FOREIGN KEY (shop_id) REFERENCES shop (id)
    );
    
    -- Create views
    DROP VIEW IF EXISTS shop_summary;
    CREATE VIEW shop_summary AS
    SELECT s.id, s.name, s.location, s.size, s.rent, s.status,
           t.name as tenant_name, t.id as tenant_id,
           COUNT(m.id) as maintenance_count
    FROM shop s
    LEFT JOIN tenant t ON s.id = t.shop_id
    LEFT JOIN maintenance m ON s.id = m.shop_id AND (m.status = 'Pending' OR m.status = 'In Progress')
    GROUP BY s.id;
    
    DROP VIEW IF EXISTS tenant_lease_view;
    CREATE VIEW tenant_lease_view AS
    SELECT t.id, t.name, t.contact, t.email, t.business_type, t.shop_id, 
           s.name as shop_name, s.status as shop_status,
           l.id as lease_id, l.start_date, l.end_date, l.rent_amount, l.status as lease_status
    FROM tenant t
    LEFT JOIN shop s ON t.shop_id = s.id
    LEFT JOIN lease l ON t.id = l.tenant_id AND l.status = 'Active';
    
    DROP VIEW IF EXISTS maintenance_details;
    CREATE VIEW maintenance_details AS
    SELECT m.*, s.name as shop_name, s.location, s.status as shop_status,
           t.name as tenant_name, t.contact as tenant_contact
    FROM maintenance m
    JOIN shop s ON m.shop_id = s.id
    LEFT JOIN tenant t ON s.id = t.shop_id;
    
    -- Triggers for maintaining shop status
    DROP TRIGGER IF EXISTS update_shop_status_on_tenant_insert;
    CREATE TRIGGER update_shop_status_on_tenant_insert
    AFTER INSERT ON tenant
    BEGIN
        UPDATE shop 
        SET status = 'Occupied' 
        WHERE id = NEW.shop_id AND status = 'Vacant';
    END;
    
    DROP TRIGGER IF EXISTS update_shop_status_on_tenant_update;
    CREATE TRIGGER update_shop_status_on_tenant_update
    AFTER UPDATE ON tenant
    WHEN OLD.shop_id != NEW.shop_id
    BEGIN
        -- Set new shop to occupied
        UPDATE shop 
        SET status = 'Occupied' 
        WHERE id = NEW.shop_id AND status = 'Vacant';
        
        -- Check if old shop has any tenants left
        UPDATE shop 
        SET status = 'Vacant' 
        WHERE id = OLD.shop_id AND 
              (SELECT COUNT(*) FROM tenant WHERE shop_id = OLD.shop_id) = 0;
    END;
    
    DROP TRIGGER IF EXISTS update_shop_status_on_tenant_delete;
    CREATE TRIGGER update_shop_status_on_tenant_delete
    AFTER DELETE ON tenant
    BEGIN
        -- Check if shop has any tenants left
        UPDATE shop 
        SET status = 'Vacant' 
        WHERE id = OLD.shop_id AND 
              (SELECT COUNT(*) FROM tenant WHERE shop_id = OLD.shop_id) = 0;
    END;
    
    DROP TRIGGER IF EXISTS update_maintenance_resolved_date;
    CREATE TRIGGER update_maintenance_resolved_date
    AFTER UPDATE ON maintenance
    WHEN NEW.status = 'Completed' AND OLD.status != 'Completed' AND NEW.resolved_date IS NULL
    BEGIN
        UPDATE maintenance
        SET resolved_date = datetime('now')
        WHERE id = NEW.id;
    END;
    
    DROP TRIGGER IF EXISTS update_shop_with_maintenance;
    CREATE TRIGGER update_shop_with_maintenance
    AFTER INSERT ON maintenance
    WHEN NEW.status = 'Pending' AND NEW.priority = 'High'
    BEGIN
        UPDATE shop
        SET status = 'Maintenance'
        WHERE id = NEW.shop_id;
    END;
    ''')
    
    # Check if data exists
    cursor.execute('SELECT COUNT(*) FROM shop')
    count = cursor.fetchone()[0]
    
    # Add sample data if the database is empty
    if count == 0:
        # Add sample shops
        cursor.executescript('''
        INSERT INTO shop (name, location, size, rent, status) VALUES 
        ('Clothing Store', '1st Floor', 100, 5000, 'Occupied'),
        ('Electronics', '2nd Floor', 150, 7500, 'Vacant'),
        ('Café', 'Ground Floor', 80, 4000, 'Occupied'),
        ('Bookstore', '3rd Floor', 120, 6000, 'Occupied');
        
        INSERT INTO tenant (name, contact, email, business_type, shop_id) VALUES
        ('John Doe', '9876543210', 'john@example.com', 'Retail', 1),
        ('Jane Smith', '8765432109', 'jane@example.com', 'Food', 3),
        ('Bob Johnson', '7654321098', 'bob@example.com', 'Books', 4);
        
        INSERT INTO lease (tenant_id, shop_id, start_date, end_date, rent_amount, status) VALUES
        (1, 1, '2023-01-01', '2024-01-01', 5000, 'Active'),
        (2, 3, '2023-03-01', '2024-03-01', 4000, 'Active'),
        (3, 4, '2023-06-01', '2024-06-01', 6000, 'Active');
        
        INSERT INTO maintenance (shop_id, description, reported_date, status, priority, resolved_date, resolution_notes) VALUES
        (1, 'Leaky pipe in restroom', '2023-07-15 10:30:00', 'Pending', 'High', NULL, NULL),
        (3, 'AC not working properly', '2023-07-16 14:45:00', 'In Progress', 'Medium', NULL, NULL),
        (4, 'Light fixture replacement needed', '2023-07-17 09:15:00', 'Pending', 'Low', NULL, NULL);
        ''')
    
    # Create stored procedures (implemented as Python functions since SQLite doesn't support proper stored procedures)
    cursor.executescript('''
    CREATE TABLE IF NOT EXISTS procedures (
        id INTEGER PRIMARY KEY,
        name TEXT UNIQUE,
        description TEXT
    );
    
    INSERT OR REPLACE INTO procedures (name, description) VALUES
    ('update_tenant_shop', 'Updates a tenant''s shop assignment and handles shop status changes'),
    ('complete_maintenance', 'Marks a maintenance request as complete and sets resolved date'),
    ('expire_leases', 'Checks and expires leases that have passed their end date');
    ''')
    
    conn.commit()
    conn.close()

# Stored procedure implementations
def update_tenant_shop(tenant_id, shop_id):
    conn = get_db()
    cursor = conn.cursor()
    
    # Get current tenant information
    cursor.execute('SELECT shop_id FROM tenant WHERE id = ?', (tenant_id,))
    tenant = cursor.fetchone()
    if not tenant:
        conn.close()
        return False, "Tenant not found"
    
    old_shop_id = tenant['shop_id']
    
    # Update tenant
    cursor.execute('UPDATE tenant SET shop_id = ? WHERE id = ?', (shop_id, tenant_id))
    
    # Update shop statuses - this will be handled by triggers, but we'll do it explicitly as well
    if old_shop_id and old_shop_id != shop_id:
        cursor.execute('SELECT COUNT(*) FROM tenant WHERE shop_id = ?', (old_shop_id,))
        if cursor.fetchone()[0] == 0:
            cursor.execute('UPDATE shop SET status = ? WHERE id = ?', ('Vacant', old_shop_id))
    
    if shop_id:
        cursor.execute('UPDATE shop SET status = ? WHERE id = ?', ('Occupied', shop_id))
    
    conn.commit()
    conn.close()
    
    return True, "Tenant shop updated successfully"

def complete_maintenance(maintenance_id, resolution_notes):
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if maintenance request exists
    cursor.execute('SELECT id, shop_id FROM maintenance WHERE id = ?', (maintenance_id,))
    maintenance = cursor.fetchone()
    if not maintenance:
        conn.close()
        return False, "Maintenance request not found"
    
    # Update maintenance request
    resolved_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    cursor.execute('''
    UPDATE maintenance SET 
        status = ?, 
        resolved_date = ?,
        resolution_notes = ?
    WHERE id = ?
    ''', ('Completed', resolved_date, resolution_notes, maintenance_id))
    
    # Check if shop status needs to be updated
    shop_id = maintenance['shop_id']
    cursor.execute('''
    SELECT COUNT(*) FROM maintenance 
    WHERE shop_id = ? AND status != 'Completed'
    ''', (shop_id,))
    
    if cursor.fetchone()[0] == 0:
        # Check shop current status
        cursor.execute('SELECT status FROM shop WHERE id = ?', (shop_id,))
        shop = cursor.fetchone()
        
        # If shop is in maintenance status and no more pending requests, update status
        if shop and shop['status'] == 'Maintenance':
            # Check if shop has tenants
            cursor.execute('SELECT COUNT(*) FROM tenant WHERE shop_id = ?', (shop_id,))
            if cursor.fetchone()[0] > 0:
                cursor.execute('UPDATE shop SET status = ? WHERE id = ?', ('Occupied', shop_id))
            else:
                cursor.execute('UPDATE shop SET status = ? WHERE id = ?', ('Vacant', shop_id))
    
    conn.commit()
    conn.close()
    
    return True, "Maintenance request completed successfully"

def expire_leases():
    conn = get_db()
    cursor = conn.cursor()
    
    today = datetime.now().strftime('%Y-%m-%d')
    
    # Find leases that have passed their end date
    cursor.execute('''
    SELECT l.id, l.shop_id, l.tenant_id
    FROM lease l
    WHERE l.end_date < ? AND l.status = 'Active'
    ''', (today,))
    
    expired_leases = cursor.fetchall()
    updated_count = 0
    
    for lease in expired_leases:
        # Update lease status
        cursor.execute('UPDATE lease SET status = ? WHERE id = ?', ('Expired', lease['id']))
        updated_count += 1
    
    conn.commit()
    conn.close()
    
    return True, f"Updated {updated_count} expired leases"

# Routes for web pages
@app.route('/')
def home():
    return app.send_static_file('index.html')

# API Routes
@app.route('/api/dashboard')
def dashboard_data():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) FROM shop')
    total_shops = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM shop WHERE status = "Occupied"')
    occupied_shops = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM tenant')
    total_tenants = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM maintenance WHERE status = "Pending" OR status = "In Progress"')
    pending_maintenance = cursor.fetchone()[0]
    
    # Expire any leases that have passed their end date
    expire_leases()
    
    conn.close()
    
    return jsonify({
        'total_shops': total_shops,
        'occupied_shops': occupied_shops,
        'total_tenants': total_tenants,
        'pending_maintenance': pending_maintenance
    })

@app.route('/api/shops', methods=['GET'])
def get_shops():
    conn = get_db()
    cursor = conn.cursor()
    
    # Use the shop_summary view for more detailed information
    cursor.execute('SELECT * FROM shop_summary')
    shops = cursor.fetchall()
    
    conn.close()
    
    return jsonify([{
        'id': shop['id'],
        'name': shop['name'],
        'location': shop['location'],
        'size': shop['size'],
        'rent': shop['rent'],
        'status': shop['status'],
        'tenant_name': shop['tenant_name'],
        'tenant_id': shop['tenant_id'],
        'maintenance_count': shop['maintenance_count']
    } for shop in shops])

@app.route('/api/shops', methods=['POST'])
def create_shop():
    data = request.json
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Extract shop data from request
    name = data.get('name')
    location = data.get('location')
    size = data.get('size')
    rent = data.get('rent')
    status = data.get('status', 'Vacant')  # Default status is Vacant
    
    # Validate required fields
    if not name:
        return jsonify({'error': 'Shop name is required'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Insert new shop
    cursor.execute('''
    INSERT INTO shop (name, location, size, rent, status)
    VALUES (?, ?, ?, ?, ?)
    ''', (name, location, size, rent, status))
    
    shop_id = cursor.lastrowid
    
    conn.commit()
    conn.close()
    
    return jsonify({
        'message': 'Shop created successfully',
        'id': shop_id
    }), 201

@app.route('/api/shops/<int:shop_id>', methods=['GET'])
def get_shop(shop_id):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM shop WHERE id = ?', (shop_id,))
    shop = cursor.fetchone()
    
    if not shop:
        conn.close()
        return jsonify({'error': 'Shop not found'}), 404
    
    conn.close()
    
    return jsonify({
        'id': shop['id'],
        'name': shop['name'],
        'location': shop['location'],
        'size': shop['size'],
        'rent': shop['rent'],
        'status': shop['status']
    })

@app.route('/api/shops/<int:shop_id>', methods=['PUT'])
def update_shop(shop_id):
    data = request.json
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Extract shop data from request
    name = data.get('name')
    location = data.get('location')
    size = data.get('size')
    rent = data.get('rent')
    status = data.get('status')
    
    # Validate required fields
    if not name:
        return jsonify({'error': 'Shop name is required'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if shop exists
    cursor.execute('SELECT id FROM shop WHERE id = ?', (shop_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Shop not found'}), 404
    
    # Update shop
    cursor.execute('''
    UPDATE shop SET 
        name = ?, 
        location = ?, 
        size = ?, 
        rent = ?, 
        status = ?
    WHERE id = ?
    ''', (name, location, size, rent, status, shop_id))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Shop updated successfully', 'id': shop_id})

@app.route('/api/shops/<int:shop_id>', methods=['DELETE'])
def delete_shop(shop_id):
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if shop exists
    cursor.execute('SELECT id FROM shop WHERE id = ?', (shop_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Shop not found'}), 404
    
    # Get the tenant IDs associated with this shop
    cursor.execute('SELECT id FROM tenant WHERE shop_id = ?', (shop_id,))
    tenant_ids = [tenant['id'] for tenant in cursor.fetchall()]
    
    # Check if any tenant has other active leases
    for tenant_id in tenant_ids:
        cursor.execute('''
        SELECT COUNT(*) FROM lease 
        WHERE tenant_id = ? AND shop_id != ? AND status = 'Active'
        ''', (tenant_id, shop_id))
        
        if cursor.fetchone()[0] > 0:
            conn.close()
            return jsonify({'error': 'Cannot delete shop. Tenant has active leases with other shops.'}), 400
    
    # Get all related maintenance requests
    cursor.execute('SELECT id FROM maintenance WHERE shop_id = ?', (shop_id,))
    maintenance_ids = [req['id'] for req in cursor.fetchall()]
    
    # Delete maintenance requests
    if maintenance_ids:
        cursor.executemany('DELETE FROM maintenance WHERE id = ?', [(id,) for id in maintenance_ids])
    
    # Delete related leases
    cursor.execute('DELETE FROM lease WHERE shop_id = ?', (shop_id,))
    
    # Update tenants to remove shop assignment
    cursor.execute('UPDATE tenant SET shop_id = NULL WHERE shop_id = ?', (shop_id,))
    
    # Delete shop
    cursor.execute('DELETE FROM shop WHERE id = ?', (shop_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Shop and all related records deleted successfully'})

@app.route('/api/tenants', methods=['GET'])
def get_tenants():
    conn = get_db()
    cursor = conn.cursor()
    
    # Use the tenant_lease_view to get comprehensive tenant info
    cursor.execute('SELECT * FROM tenant_lease_view')
    tenants = cursor.fetchall()
    
    conn.close()
    
    return jsonify([{
        'id': tenant['id'],
        'name': tenant['name'],
        'contact': tenant['contact'],
        'email': tenant['email'],
        'business_type': tenant['business_type'],
        'shop_id': tenant['shop_id'],
        'shop_name': tenant['shop_name'],
        'shop_status': tenant['shop_status'],
        'lease_id': tenant['lease_id'],
        'lease_start': tenant['start_date'],
        'lease_end': tenant['end_date'],
        'lease_rent': tenant['rent_amount'],
        'lease_status': tenant['lease_status']
    } for tenant in tenants])

@app.route('/api/tenants', methods=['POST'])
def create_tenant():
    data = request.json
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Extract tenant data from request
    name = data.get('name')
    contact = data.get('contact')
    email = data.get('email')
    business_type = data.get('business_type')
    shop_id = data.get('shop_id')
    
    # Validate required fields
    if not name:
        return jsonify({'error': 'Tenant name is required'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    # If shop_id is provided, check if it exists and is not already occupied
    if shop_id:
        cursor.execute('SELECT id, status FROM shop WHERE id = ?', (shop_id,))
        shop = cursor.fetchone()
        if not shop:
            conn.close()
            return jsonify({'error': 'Shop not found'}), 404
        
        # Check if shop is already occupied by another tenant
        cursor.execute('SELECT id FROM tenant WHERE shop_id = ?', (shop_id,))
        existing_tenant = cursor.fetchone()
        if existing_tenant:
            conn.close()
            return jsonify({'error': 'Shop is already assigned to another tenant'}), 400
    
    # Insert new tenant
    cursor.execute('''
    INSERT INTO tenant (name, contact, email, business_type, shop_id)
    VALUES (?, ?, ?, ?, ?)
    ''', (name, contact, email, business_type, shop_id))
    
    tenant_id = cursor.lastrowid
    
    # Shop status will be updated by the trigger
    
    conn.commit()
    conn.close()
    
    return jsonify({
        'message': 'Tenant created successfully',
        'id': tenant_id
    }), 201

@app.route('/api/tenants/<int:tenant_id>', methods=['GET'])
def get_tenant(tenant_id):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
    SELECT t.*, s.name as shop_name
    FROM tenant t
    LEFT JOIN shop s ON t.shop_id = s.id
    WHERE t.id = ?
    ''', (tenant_id,))
    tenant = cursor.fetchone()
    
    if not tenant:
        conn.close()
        return jsonify({'error': 'Tenant not found'}), 404
    
    conn.close()
    
    return jsonify({
        'id': tenant['id'],
        'name': tenant['name'],
        'contact': tenant['contact'],
        'email': tenant['email'],
        'business_type': tenant['business_type'],
        'shop_id': tenant['shop_id'],
        'shop_name': tenant['shop_name']
    })

@app.route('/api/tenants/<int:tenant_id>', methods=['PUT'])
def update_tenant(tenant_id):
    data = request.json
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Extract tenant data from request
    name = data.get('name')
    contact = data.get('contact')
    email = data.get('email')
    business_type = data.get('business_type')
    shop_id = data.get('shop_id')
    
    # Validate required fields
    if not name:
        return jsonify({'error': 'Tenant name is required'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if tenant exists
    cursor.execute('SELECT shop_id FROM tenant WHERE id = ?', (tenant_id,))
    tenant = cursor.fetchone()
    if not tenant:
        conn.close()
        return jsonify({'error': 'Tenant not found'}), 404
    
    old_shop_id = tenant['shop_id']
    
    # First update basic tenant information without changing shop
    cursor.execute('''
    UPDATE tenant SET 
        name = ?, 
        contact = ?, 
        email = ?, 
        business_type = ?
    WHERE id = ?
    ''', (name, contact, email, business_type, tenant_id))
    
    # If shop assignment has changed, use the stored procedure
    if old_shop_id != shop_id:
        conn.commit()  # Commit the basic info changes
        conn.close()   # Close this connection
        
        # Use the stored procedure to handle shop assignment
        success, message = update_tenant_shop(tenant_id, shop_id)
        
        if not success:
            return jsonify({'error': message}), 400
    else:
        conn.commit()
        conn.close()
    
    return jsonify({'message': 'Tenant updated successfully', 'id': tenant_id})

@app.route('/api/tenants/<int:tenant_id>', methods=['DELETE'])
def delete_tenant(tenant_id):
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if tenant exists
    cursor.execute('SELECT shop_id FROM tenant WHERE id = ?', (tenant_id,))
    tenant = cursor.fetchone()
    if not tenant:
        conn.close()
        return jsonify({'error': 'Tenant not found'}), 404
    
    # Get all leases for this tenant
    cursor.execute('SELECT id, shop_id, status FROM lease WHERE tenant_id = ?', (tenant_id,))
    leases = cursor.fetchall()
    
    # Delete all leases for this tenant
    if leases:
        # Check for active leases and handle related shop status changes
        for lease in leases:
            if lease['status'] == 'Active':
                shop_id = lease['shop_id']
                
                # Check if other tenants are using this shop
                cursor.execute('''
                SELECT COUNT(*) FROM tenant 
                WHERE shop_id = ? AND id != ?
                ''', (shop_id, tenant_id))
                
                other_tenants = cursor.fetchone()[0]
                
                # If no other tenants are using this shop, set it to vacant
                if other_tenants == 0:
                    cursor.execute('UPDATE shop SET status = ? WHERE id = ?', ('Vacant', shop_id))
        
        # Delete the leases
        cursor.execute('DELETE FROM lease WHERE tenant_id = ?', (tenant_id,))
    
    # Delete the tenant
    cursor.execute('DELETE FROM tenant WHERE id = ?', (tenant_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Tenant and associated leases deleted successfully'})

@app.route('/api/leases', methods=['GET'])
def get_leases():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
    SELECT l.*, t.name as tenant_name, s.name as shop_name
    FROM lease l
    JOIN tenant t ON l.tenant_id = t.id
    JOIN shop s ON l.shop_id = s.id
    ''')
    leases = cursor.fetchall()
    
    conn.close()
    
    return jsonify([{
        'id': lease['id'],
        'tenant_id': lease['tenant_id'],
        'tenant_name': lease['tenant_name'],
        'shop_id': lease['shop_id'],
        'shop_name': lease['shop_name'],
        'start_date': lease['start_date'],
        'end_date': lease['end_date'],
        'rent_amount': lease['rent_amount'],
        'status': lease['status']
    } for lease in leases])

@app.route('/api/leases', methods=['POST'])
def create_lease():
    data = request.json
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Extract lease data from request
    tenant_id = data.get('tenant_id')
    shop_id = data.get('shop_id')
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    rent_amount = data.get('rent_amount')
    status = data.get('status', 'Active')
    
    # Validate required fields
    if not tenant_id:
        return jsonify({'error': 'Tenant ID is required'}), 400
    if not shop_id:
        return jsonify({'error': 'Shop ID is required'}), 400
    if not start_date:
        return jsonify({'error': 'Start date is required'}), 400
    if not end_date:
        return jsonify({'error': 'End date is required'}), 400
    if not rent_amount:
        return jsonify({'error': 'Rent amount is required'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if tenant and shop exist
    cursor.execute('SELECT id FROM tenant WHERE id = ?', (tenant_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Tenant not found'}), 404
    
    cursor.execute('SELECT id, status FROM shop WHERE id = ?', (shop_id,))
    shop = cursor.fetchone()
    if not shop:
        conn.close()
        return jsonify({'error': 'Shop not found'}), 404
    
    # Check for conflicting leases (active leases for the same shop)
    if status == 'Active':
        cursor.execute('''
        SELECT id FROM lease 
        WHERE shop_id = ? AND status = 'Active'
        ''', (shop_id,))
        
        if cursor.fetchone():
            conn.close()
            return jsonify({'error': 'Shop already has an active lease'}), 400
    
    # Convert date strings to proper format if needed
    try:
        start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
        end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
        
        # Check if end date is after start date
        if end_date_obj <= start_date_obj:
            conn.close()
            return jsonify({'error': 'End date must be after start date'}), 400
    except ValueError:
        conn.close()
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    # Insert new lease
    cursor.execute('''
    INSERT INTO lease (tenant_id, shop_id, start_date, end_date, rent_amount, status)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', (tenant_id, shop_id, start_date, end_date, rent_amount, status))
    
    lease_id = cursor.lastrowid
    
    # If the lease is active, update tenant's shop assignment
    if status == 'Active':
        # Update tenant shop_id
        cursor.execute('UPDATE tenant SET shop_id = ? WHERE id = ?', (shop_id, tenant_id))
    
    conn.commit()
    conn.close()
    
    return jsonify({
        'message': 'Lease created successfully',
        'id': lease_id
    }), 201

@app.route('/api/leases/<int:lease_id>', methods=['GET'])
def get_lease(lease_id):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
    SELECT l.*, t.name as tenant_name, s.name as shop_name
    FROM lease l
    JOIN tenant t ON l.tenant_id = t.id
    JOIN shop s ON l.shop_id = s.id
    WHERE l.id = ?
    ''', (lease_id,))
    lease = cursor.fetchone()
    
    if not lease:
        conn.close()
        return jsonify({'error': 'Lease not found'}), 404
    
    conn.close()
    
    return jsonify({
        'id': lease['id'],
        'tenant_id': lease['tenant_id'],
        'tenant_name': lease['tenant_name'],
        'shop_id': lease['shop_id'],
        'shop_name': lease['shop_name'],
        'start_date': lease['start_date'],
        'end_date': lease['end_date'],
        'rent_amount': lease['rent_amount'],
        'status': lease['status']
    })

@app.route('/api/leases/<int:lease_id>', methods=['PUT'])
def update_lease(lease_id):
    data = request.json
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Extract lease data from request
    tenant_id = data.get('tenant_id')
    shop_id = data.get('shop_id')
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    rent_amount = data.get('rent_amount')
    status = data.get('status')
    
    # Validate required fields
    if not tenant_id:
        return jsonify({'error': 'Tenant ID is required'}), 400
    if not shop_id:
        return jsonify({'error': 'Shop ID is required'}), 400
    if not start_date:
        return jsonify({'error': 'Start date is required'}), 400
    if not end_date:
        return jsonify({'error': 'End date is required'}), 400
    if not rent_amount:
        return jsonify({'error': 'Rent amount is required'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if lease exists and get current information
    cursor.execute('SELECT shop_id, tenant_id, status FROM lease WHERE id = ?', (lease_id,))
    lease = cursor.fetchone()
    if not lease:
        conn.close()
        return jsonify({'error': 'Lease not found'}), 404
    
    old_shop_id = lease['shop_id']
    old_tenant_id = lease['tenant_id']
    old_status = lease['status']
    
    # Check if tenant and shop exist
    cursor.execute('SELECT id FROM tenant WHERE id = ?', (tenant_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Tenant not found'}), 404
    
    cursor.execute('SELECT id FROM shop WHERE id = ?', (shop_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Shop not found'}), 404
    
    # Check for conflicting leases (active leases for the same shop)
    if status == 'Active' and shop_id != old_shop_id:
        cursor.execute('''
        SELECT id FROM lease 
        WHERE shop_id = ? AND status = 'Active' AND id != ?
        ''', (shop_id, lease_id))
        
        if cursor.fetchone():
            conn.close()
            return jsonify({'error': 'Shop already has an active lease'}), 400
    
    # Update lease
    cursor.execute('''
    UPDATE lease SET 
        tenant_id = ?, 
        shop_id = ?, 
        start_date = ?, 
        end_date = ?,
        rent_amount = ?,
        status = ?
    WHERE id = ?
    ''', (tenant_id, shop_id, start_date, end_date, rent_amount, status, lease_id))
    
    # If tenant has changed or status has changed to Active, update tenant shop assignment
    if status == 'Active' and (tenant_id != old_tenant_id or old_status != 'Active'):
        # Update tenant shop_id
        update_tenant_shop(tenant_id, shop_id)
    
    # If lease was Active but is no longer active, check if tenant needs shop update
    if old_status == 'Active' and status != 'Active':
        # Check if tenant has other active leases
        cursor.execute('''
        SELECT l.shop_id
        FROM lease l
        WHERE l.tenant_id = ? AND l.status = 'Active' AND l.id != ?
        LIMIT 1
        ''', (old_tenant_id, lease_id))
        
        other_lease = cursor.fetchone()
        
        if other_lease:
            # Update tenant to use shop from other active lease
            update_tenant_shop(old_tenant_id, other_lease['shop_id'])
        else:
            # No other active leases, set tenant shop to NULL
            update_tenant_shop(old_tenant_id, None)
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Lease updated successfully', 'id': lease_id})

@app.route('/api/leases/<int:lease_id>', methods=['DELETE'])
def delete_lease(lease_id):
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if lease exists and get current information
    cursor.execute('SELECT shop_id, tenant_id, status FROM lease WHERE id = ?', (lease_id,))
    lease = cursor.fetchone()
    if not lease:
        conn.close()
        return jsonify({'error': 'Lease not found'}), 404
    
    tenant_id = lease['tenant_id']
    was_active = lease['status'] == 'Active'
    
    # Delete lease
    cursor.execute('DELETE FROM lease WHERE id = ?', (lease_id,))
    
    # If lease was active, check if tenant needs shop update
    if was_active:
        # Check if tenant has other active leases
        cursor.execute('''
        SELECT l.shop_id 
        FROM lease l
        WHERE l.tenant_id = ? AND l.status = 'Active'
        LIMIT 1
        ''', (tenant_id,))
        
        other_lease = cursor.fetchone()
        
        if other_lease:
            # Update tenant to use shop from other active lease
            update_tenant_shop(tenant_id, other_lease['shop_id'])
        else:
            # No other active leases, set tenant shop to NULL
            update_tenant_shop(tenant_id, None)
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Lease deleted successfully'})

@app.route('/api/maintenance', methods=['GET'])
def get_maintenance_requests():
    conn = get_db()
    cursor = conn.cursor()
    
    # Use the maintenance_details view
    cursor.execute('SELECT * FROM maintenance_details ORDER BY id DESC')
    maintenance = cursor.fetchall()
    
    conn.close()
    
    return jsonify([{
        'id': req['id'],
        'shop_id': req['shop_id'],
        'shop_name': req['shop_name'],
        'description': req['description'],
        'reported_date': req['reported_date'],
        'status': req['status'],
        'priority': req['priority'],
        'resolved_date': req.get('resolved_date'),  # Use get() to handle nullable fields
        'resolution_notes': req.get('resolution_notes'),
        'tenant_name': req.get('tenant_name'),
        'tenant_contact': req.get('tenant_contact')
    } for req in maintenance])

@app.route('/api/maintenance', methods=['POST'])
def create_maintenance_request():
    data = request.json
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Extract maintenance data from request
    shop_id = data.get('shop_id')
    description = data.get('description')
    reported_date = data.get('reported_date', datetime.now().strftime('%Y-%m-%d'))
    status = data.get('status', 'Pending')
    priority = data.get('priority', 'Medium')
    resolved_date = data.get('resolved_date')
    resolution_notes = data.get('resolution_notes')
    
    # Validate required fields
    if not shop_id:
        return jsonify({'error': 'Shop ID is required'}), 400
    if not description:
        return jsonify({'error': 'Description is required'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if shop exists
    cursor.execute('SELECT id FROM shop WHERE id = ?', (shop_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Shop not found'}), 404
    
    # If status is completed but no resolved_date is provided, set it to now
    if status == 'Completed' and not resolved_date:
        resolved_date = datetime.now().strftime('%Y-%m-%d')
    
    # Insert new maintenance request
    cursor.execute('''
    INSERT INTO maintenance (shop_id, description, reported_date, status, priority, resolved_date, resolution_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (shop_id, description, reported_date, status, priority, resolved_date, resolution_notes))
    
    maintenance_id = cursor.lastrowid
    
    conn.commit()
    conn.close()
    
    return jsonify({
        'message': 'Maintenance request created successfully',
        'id': maintenance_id
    }), 201

@app.route('/api/maintenance/<int:maintenance_id>', methods=['GET'])
def get_maintenance_request(maintenance_id):
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
    SELECT m.*, s.name as shop_name
    FROM maintenance m
    LEFT JOIN shop s ON m.shop_id = s.id
    WHERE m.id = ?
    ''', (maintenance_id,))
    request = cursor.fetchone()
    
    if not request:
        conn.close()
        return jsonify({'error': 'Maintenance request not found'}), 404
    
    conn.close()
    
    return jsonify({
        'id': request['id'],
        'shop_id': request['shop_id'],
        'shop_name': request['shop_name'],
        'description': request['description'],
        'reported_date': request['reported_date'],
        'status': request['status'],
        'priority': request['priority'],
        'resolved_date': request.get('resolved_date'),
        'resolution_notes': request.get('resolution_notes')
    })

@app.route('/api/maintenance/<int:maintenance_id>', methods=['PUT'])
def update_maintenance_request(maintenance_id):
    data = request.json
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Extract maintenance data from request
    shop_id = data.get('shop_id')
    description = data.get('description')
    reported_date = data.get('reported_date')
    status = data.get('status')
    priority = data.get('priority')
    resolved_date = data.get('resolved_date')
    resolution_notes = data.get('resolution_notes')
    
    # Validate required fields
    if not shop_id:
        return jsonify({'error': 'Shop ID is required'}), 400
    if not description:
        return jsonify({'error': 'Description is required'}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if maintenance request exists
    cursor.execute('SELECT id FROM maintenance WHERE id = ?', (maintenance_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Maintenance request not found'}), 404
    
    # Check if shop exists
    cursor.execute('SELECT id FROM shop WHERE id = ?', (shop_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Shop not found'}), 404
    
    # Set resolved_date automatically if status changed to Resolved
    if status == 'Resolved' and not resolved_date:
        resolved_date = datetime.now().strftime('%Y-%m-%d')
    
    # Update maintenance request
    cursor.execute('''
    UPDATE maintenance SET 
        shop_id = ?, 
        description = ?, 
        reported_date = ?, 
        status = ?,
        priority = ?,
        resolved_date = ?,
        resolution_notes = ?
    WHERE id = ?
    ''', (shop_id, description, reported_date, status, priority, 
          resolved_date, resolution_notes, maintenance_id))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Maintenance request updated successfully', 'id': maintenance_id})

@app.route('/api/maintenance/<int:maintenance_id>', methods=['DELETE'])
def delete_maintenance_request(maintenance_id):
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if maintenance request exists
    cursor.execute('SELECT id FROM maintenance WHERE id = ?', (maintenance_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Maintenance request not found'}), 404
    
    # Delete maintenance request
    cursor.execute('DELETE FROM maintenance WHERE id = ?', (maintenance_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Maintenance request deleted successfully'})

@app.route('/api/maintenance/<int:maintenance_id>/complete', methods=['POST'])
def complete_maintenance_request(maintenance_id):
    data = request.json
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    resolution_notes = data.get('resolution_notes', '')
    
    # Use the stored procedure to complete the maintenance request
    success, message = complete_maintenance(maintenance_id, resolution_notes)
    
    if not success:
        return jsonify({'error': message}), 400
    
    return jsonify({'message': message})

@app.route('/api/tenants/update-shop', methods=['POST'])
def update_tenant_shop_endpoint():
    data = request.json
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    tenant_id = data.get('tenant_id')
    shop_id = data.get('shop_id')
    
    if not tenant_id:
        return jsonify({'error': 'Tenant ID is required'}), 400
    
    # Use the stored procedure to update the tenant's shop
    success, message = update_tenant_shop(tenant_id, shop_id)
    
    if not success:
        return jsonify({'error': message}), 400
    
    return jsonify({'message': message})

@app.route('/api/leases/expire-check', methods=['POST'])
def check_expired_leases():
    # Use the stored procedure to check and update expired leases
    success, message = expire_leases()
    
    if not success:
        return jsonify({'error': message}), 400
    
    return jsonify({'message': message})

if __name__ == '__main__':
    # Initialize database
    init_db()
    app.run(debug=True)

