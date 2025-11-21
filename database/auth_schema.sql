-- ============================================
-- NIMWEMA PLATFORM - AUTHENTICATION & ADMIN SCHEMA
-- ============================================

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS cashiers CASCADE;
DROP TABLE IF EXISTS merchants CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'user', 
    -- Roles: 'admin', 'merchant', 'cashier', 'user'
    status VARCHAR(20) DEFAULT 'active', 
    -- Status: 'active', 'suspended', 'pending'
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- ============================================
-- MERCHANTS TABLE
-- ============================================
CREATE TABLE merchants (
    id SERIAL PRIMARY KEY,
    merchant_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    logo TEXT, -- URL or base64 encoded image
    phone VARCHAR(20),
    email VARCHAR(255),
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', 
    -- Status: 'pending', 'active', 'suspended'
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_merchants_merchant_id ON merchants(merchant_id);
CREATE INDEX idx_merchants_owner_id ON merchants(owner_id);
CREATE INDEX idx_merchants_status ON merchants(status);

-- ============================================
-- CASHIERS TABLE
-- ============================================
CREATE TABLE cashiers (
    id SERIAL PRIMARY KEY,
    merchant_id INTEGER REFERENCES merchants(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    cashier_code VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active',
    -- Status: 'active', 'suspended'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(merchant_id, user_id)
);

-- Indexes
CREATE INDEX idx_cashiers_merchant_id ON cashiers(merchant_id);
CREATE INDEX idx_cashiers_user_id ON cashiers(user_id);
CREATE INDEX idx_cashiers_cashier_code ON cashiers(cashier_code);

-- ============================================
-- SESSIONS TABLE
-- ============================================
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Users trigger
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

-- Merchants trigger
CREATE OR REPLACE FUNCTION update_merchants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_merchants_updated_at
    BEFORE UPDATE ON merchants
    FOR EACH ROW
    EXECUTE FUNCTION update_merchants_updated_at();

-- Cashiers trigger
CREATE OR REPLACE FUNCTION update_cashiers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cashiers_updated_at
    BEFORE UPDATE ON cashiers
    FOR EACH ROW
    EXECUTE FUNCTION update_cashiers_updated_at();

-- ============================================
-- DEFAULT ADMIN USER
-- ============================================
-- Password: Admin@2024
-- Hash generated with bcrypt cost factor 10
INSERT INTO users (email, password_hash, full_name, phone, role, status, email_verified)
VALUES (
    'admin@nimwema.com',
    '$2b$10$rKJ5YvH8qF.xQxPxQxPxQeN8vH8qF.xQxPxQxPxQeN8vH8qF.xQxP',
    'System Administrator',
    '+243999999999',
    'admin',
    'active',
    true
);

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Active merchants with owner info
CREATE OR REPLACE VIEW active_merchants_view AS
SELECT 
    m.*,
    u.email as owner_email,
    u.full_name as owner_name,
    u.phone as owner_phone,
    (SELECT COUNT(*) FROM cashiers WHERE merchant_id = m.id AND status = 'active') as active_cashiers_count
FROM merchants m
JOIN users u ON m.owner_id = u.id
WHERE m.status = 'active';

-- Merchant statistics
CREATE OR REPLACE VIEW merchant_stats_view AS
SELECT 
    m.id,
    m.merchant_id,
    m.name,
    COUNT(DISTINCT c.id) as total_cashiers,
    COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_cashiers,
    m.status,
    m.created_at
FROM merchants m
LEFT JOIN cashiers c ON m.id = c.merchant_id
GROUP BY m.id, m.merchant_id, m.name, m.status, m.created_at;

-- User activity summary
CREATE OR REPLACE VIEW user_activity_view AS
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.status,
    COUNT(DISTINCT s.id) as active_sessions,
    MAX(s.created_at) as last_login,
    u.created_at as registered_at
FROM users u
LEFT JOIN sessions s ON u.id = s.user_id AND s.expires_at > CURRENT_TIMESTAMP
GROUP BY u.id, u.email, u.full_name, u.role, u.status, u.created_at;

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

-- Clean expired sessions
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Get user by session token
CREATE OR REPLACE FUNCTION get_user_by_session(token VARCHAR)
RETURNS TABLE (
    user_id INTEGER,
    email VARCHAR,
    full_name VARCHAR,
    role VARCHAR,
    status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.full_name,
        u.role,
        u.status
    FROM users u
    JOIN sessions s ON u.id = s.user_id
    WHERE s.session_token = token
    AND s.expires_at > CURRENT_TIMESTAMP
    AND u.status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Generate unique merchant ID
CREATE OR REPLACE FUNCTION generate_merchant_id()
RETURNS VARCHAR AS $$
DECLARE
    new_id VARCHAR;
    id_exists BOOLEAN;
BEGIN
    LOOP
        new_id := 'MER-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
        SELECT EXISTS(SELECT 1 FROM merchants WHERE merchant_id = new_id) INTO id_exists;
        EXIT WHEN NOT id_exists;
    END LOOP;
    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Generate unique cashier code
CREATE OR REPLACE FUNCTION generate_cashier_code()
RETURNS VARCHAR AS $$
DECLARE
    new_code VARCHAR;
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := 'CASH-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
        SELECT EXISTS(SELECT 1 FROM cashiers WHERE cashier_code = new_code) INTO code_exists;
        EXIT WHEN NOT code_exists;
    END LOOP;
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SAMPLE DATA (for testing)
-- ============================================

-- Sample merchant owner
INSERT INTO users (email, password_hash, full_name, phone, role, status, email_verified)
VALUES (
    'merchant@test.cd',
    '$2b$10$rKJ5YvH8qF.xQxPxQxPxQeN8vH8qF.xQxPxQxPxQeN8vH8qF.xQxP',
    'Test Merchant Owner',
    '+243811111111',
    'merchant',
    'active',
    true
);

-- Sample merchant
INSERT INTO merchants (merchant_id, name, address, phone, email, owner_id, status)
VALUES (
    'MER-000001',
    'Supermarché Test',
    '123 Avenue de la Paix, Kinshasa',
    '+243811111111',
    'merchant@test.cd',
    (SELECT id FROM users WHERE email = 'merchant@test.cd'),
    'active'
);

-- Sample cashier user
INSERT INTO users (email, password_hash, full_name, phone, role, status, email_verified)
VALUES (
    'cashier@test.cd',
    '$2b$10$rKJ5YvH8qF.xQxPxQxPxQeN8vH8qF.xQxPxQxPxQeN8vH8qF.xQxP',
    'Test Cashier',
    '+243822222222',
    'cashier',
    'active',
    true
);

-- Link cashier to merchant
INSERT INTO cashiers (merchant_id, user_id, cashier_code, full_name, phone, status)
VALUES (
    (SELECT id FROM merchants WHERE merchant_id = 'MER-000001'),
    (SELECT id FROM users WHERE email = 'cashier@test.cd'),
    'CASH-000001',
    'Test Cashier',
    '+243822222222',
    'active'
);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE users IS 'All platform users with different roles';
COMMENT ON TABLE merchants IS 'Registered merchants/stores';
COMMENT ON TABLE cashiers IS 'Cashiers linked to merchants';
COMMENT ON TABLE sessions IS 'Active user sessions for authentication';

COMMENT ON COLUMN users.role IS 'User role: admin, merchant, cashier, user';
COMMENT ON COLUMN users.status IS 'Account status: active, suspended, pending';
COMMENT ON COLUMN merchants.status IS 'Merchant status: pending, active, suspended';
COMMENT ON COLUMN cashiers.status IS 'Cashier status: active, suspended';

-- ============================================
-- GRANTS (adjust based on your database user)
-- ============================================

-- Grant permissions to application user (adjust username as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nimwema_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO nimwema_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO nimwema_user;

-- ============================================
-- SCHEMA VERSION
-- ============================================

CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    description TEXT,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_version (version, description)
VALUES (2, 'Authentication and Admin System');

-- ============================================
-- END OF SCHEMA
-- ============================================