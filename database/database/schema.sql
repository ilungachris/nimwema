-- Nimwema Platform Database Schema
-- PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'merchant', 'admin')),
    language VARCHAR(5) DEFAULT 'fr',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- ============================================
-- REQUESTS TABLE
-- ============================================
CREATE TABLE requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
    requester_phone VARCHAR(20) NOT NULL,
    requester_first_name VARCHAR(100),
    requester_last_name VARCHAR(100),
    type VARCHAR(20) NOT NULL CHECK (type IN ('waiting_list', 'known_sender')),
    sender_name VARCHAR(200),
    sender_phone VARCHAR(20),
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'expired', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    fulfilled_at TIMESTAMP
);

-- ============================================
-- SENDERS TABLE (Saved Contacts)
-- ============================================
CREATE TABLE senders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    relationship VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(requester_id, phone)
);

-- ============================================
-- RECIPIENTS TABLE (Saved Contacts)
-- ============================================
CREATE TABLE recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    notes TEXT,
    vouchers_received INTEGER DEFAULT 0,
    total_amount DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sender_id, phone)
);

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE orders (
    id VARCHAR(50) PRIMARY KEY,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    sender_phone VARCHAR(20) NOT NULL,
    sender_name VARCHAR(200),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('USD', 'CDF')),
    quantity INTEGER NOT NULL,
    service_fee DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'cancelled')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
    message TEXT,
    hide_identity BOOLEAN DEFAULT false,
    cover_fees BOOLEAN DEFAULT false,
    flexpay_order_number VARCHAR(100),
    flutterwave_transaction_id VARCHAR(100),
    transaction_id VARCHAR(100),
    payment_initiated_at TIMESTAMP,
    paid_at TIMESTAMP,
    failed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ORDER RECIPIENTS TABLE (Many-to-Many)
-- ============================================
CREATE TABLE order_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id VARCHAR(50) REFERENCES orders(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,
    name VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- VOUCHERS TABLE
-- ============================================
CREATE TABLE vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    order_id VARCHAR(50) REFERENCES orders(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('USD', 'CDF')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'redeemed', 'expired', 'cancelled')),
    recipient_phone VARCHAR(20) NOT NULL,
    recipient_name VARCHAR(200),
    sender_name VARCHAR(200),
    message TEXT,
    hide_identity BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    redeemed_at TIMESTAMP,
    redeemed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    redeemed_location VARCHAR(255),
    merchant_id UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id VARCHAR(50) REFERENCES orders(id) ON DELETE SET NULL,
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    provider_reference VARCHAR(100),
    flexpay_order_number VARCHAR(100),
    flutterwave_transaction_id VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- ============================================
-- REDEMPTIONS TABLE
-- ============================================
CREATE TABLE redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voucher_id UUID REFERENCES vouchers(id) ON DELETE CASCADE,
    voucher_code VARCHAR(20) NOT NULL,
    merchant_id UUID REFERENCES users(id) ON DELETE SET NULL,
    merchant_name VARCHAR(200),
    merchant_phone VARCHAR(20),
    location VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SMS LOGS TABLE
-- ============================================
CREATE TABLE sms_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
    provider VARCHAR(50),
    provider_message_id VARCHAR(100),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP
);

-- ============================================
-- SETTINGS TABLE
-- ============================================
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'string' CHECK (type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================

-- Users indexes
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Requests indexes
CREATE INDEX idx_requests_requester_id ON requests(requester_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_type ON requests(type);
CREATE INDEX idx_requests_created_at ON requests(created_at DESC);

-- Senders indexes
CREATE INDEX idx_senders_requester_id ON senders(requester_id);
CREATE INDEX idx_senders_phone ON senders(phone);

-- Recipients indexes
CREATE INDEX idx_recipients_sender_id ON recipients(sender_id);
CREATE INDEX idx_recipients_phone ON recipients(phone);

-- Orders indexes
CREATE INDEX idx_orders_sender_id ON orders(sender_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_flexpay_order_number ON orders(flexpay_order_number);

-- Order recipients indexes
CREATE INDEX idx_order_recipients_order_id ON order_recipients(order_id);
CREATE INDEX idx_order_recipients_phone ON order_recipients(phone);

-- Vouchers indexes
CREATE INDEX idx_vouchers_code ON vouchers(code);
CREATE INDEX idx_vouchers_order_id ON vouchers(order_id);
CREATE INDEX idx_vouchers_status ON vouchers(status);
CREATE INDEX idx_vouchers_recipient_phone ON vouchers(recipient_phone);
CREATE INDEX idx_vouchers_created_at ON vouchers(created_at DESC);
CREATE INDEX idx_vouchers_expires_at ON vouchers(expires_at);

-- Transactions indexes
CREATE INDEX idx_transactions_order_id ON transactions(order_id);
CREATE INDEX idx_transactions_transaction_id ON transactions(transaction_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- Redemptions indexes
CREATE INDEX idx_redemptions_voucher_id ON redemptions(voucher_id);
CREATE INDEX idx_redemptions_merchant_id ON redemptions(merchant_id);
CREATE INDEX idx_redemptions_created_at ON redemptions(created_at DESC);

-- SMS logs indexes
CREATE INDEX idx_sms_logs_phone ON sms_logs(phone);
CREATE INDEX idx_sms_logs_status ON sms_logs(status);
CREATE INDEX idx_sms_logs_created_at ON sms_logs(created_at DESC);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_senders_updated_at BEFORE UPDATE ON senders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipients_updated_at BEFORE UPDATE ON recipients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vouchers_updated_at BEFORE UPDATE ON vouchers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DEFAULT SETTINGS
-- ============================================
INSERT INTO settings (key, value, type, description) VALUES
('exchange_rate_usd_cdf', '2200', 'number', 'Exchange rate: 1 USD to CDF'),
('service_fee_percentage', '3.5', 'number', 'Service fee percentage'),
('voucher_expiry_days', '90', 'number', 'Voucher expiry period in days'),
('max_vouchers_per_order', '50', 'number', 'Maximum vouchers per order'),
('max_recipients_per_batch', '50', 'number', 'Maximum recipients per batch'),
('sms_provider', 'africas_talking', 'string', 'SMS provider name'),
('platform_name', 'Nimwema', 'string', 'Platform name'),
('support_phone', '+243000000000', 'string', 'Support phone number'),
('support_email', 'support@nimwema.com', 'string', 'Support email');

-- ============================================
-- VIEWS
-- ============================================

-- Active vouchers view
CREATE VIEW active_vouchers AS
SELECT 
    v.*,
    o.sender_name,
    o.sender_phone
FROM vouchers v
LEFT JOIN orders o ON v.order_id = o.id
WHERE v.status = 'pending' 
  AND v.expires_at > CURRENT_TIMESTAMP;

-- Expired vouchers view
CREATE VIEW expired_vouchers AS
SELECT 
    v.*,
    o.sender_name,
    o.sender_phone
FROM vouchers v
LEFT JOIN orders o ON v.order_id = o.id
WHERE v.status = 'pending' 
  AND v.expires_at <= CURRENT_TIMESTAMP;

-- Order statistics view
CREATE VIEW order_statistics AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_orders,
    SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_orders,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_orders,
    SUM(total_amount) as total_amount,
    AVG(total_amount) as average_amount
FROM orders
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to expire old vouchers
CREATE OR REPLACE FUNCTION expire_old_vouchers()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE vouchers
    SET status = 'expired'
    WHERE status = 'pending'
      AND expires_at <= CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get sender statistics
CREATE OR REPLACE FUNCTION get_sender_stats(sender_user_id UUID)
RETURNS TABLE (
    total_sent DECIMAL,
    redeemed_count BIGINT,
    pending_count BIGINT,
    recipient_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(o.total_amount), 0) as total_sent,
        COALESCE(COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'redeemed'), 0) as redeemed_count,
        COALESCE(COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'pending'), 0) as pending_count,
        COALESCE(COUNT(DISTINCT r.id), 0) as recipient_count
    FROM orders o
    LEFT JOIN vouchers v ON o.id = v.order_id
    LEFT JOIN recipients r ON r.sender_id = sender_user_id
    WHERE o.sender_id = sender_user_id
      AND o.status = 'paid';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE users IS 'Platform users (requesters, senders, merchants, admins)';
COMMENT ON TABLE requests IS 'Voucher requests from requesters';
COMMENT ON TABLE senders IS 'Saved sender contacts for requesters';
COMMENT ON TABLE recipients IS 'Saved recipient contacts for senders';
COMMENT ON TABLE orders IS 'Voucher purchase orders';
COMMENT ON TABLE order_recipients IS 'Recipients for each order';
COMMENT ON TABLE vouchers IS 'Generated vouchers';
COMMENT ON TABLE transactions IS 'Payment transactions';
COMMENT ON TABLE redemptions IS 'Voucher redemption records';
COMMENT ON TABLE sms_logs IS 'SMS notification logs';
COMMENT ON TABLE settings IS 'Platform configuration settings';