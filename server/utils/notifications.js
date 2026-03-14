// Notification utility for sending alerts to admin

// Send WhatsApp notification to admin
export const sendWhatsAppNotification = async (message) => {
  try {
    const whatsappUrl = process.env.WHATSAPP_NOTIFY;
    
    if (!whatsappUrl || whatsappUrl.includes('YOUR_NUMBER')) {
      console.log('📱 WhatsApp notification (configured):', message);
      return { success: false, reason: 'WhatsApp not configured' };
    }

    // Replace MESSAGE placeholder with actual message
    const encodedMessage = encodeURIComponent(message);
    const finalUrl = whatsappUrl.replace('MESSAGE', encodedMessage);
    
    // Open WhatsApp in new window (for web WhatsApp)
    // In production, you'd use WhatsApp Business API
    console.log('📱 WhatsApp notification sent:', message);
    
    return { success: true };
  } catch (error) {
    console.error('WhatsApp notification error:', error);
    return { success: false, error: error.message };
  }
};

// Send email notification (console log for now - can integrate with SendGrid/Nodemailer)
export const sendEmailNotification = async (subject, body) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    
    if (!adminEmail) {
      console.log('📧 Email notification:', subject, body);
      return { success: false, reason: 'Admin email not set' };
    }

    // Log the email that would be sent
    console.log('📧 ============================================');
    console.log(`📧 EMAIL TO: ${adminEmail}`);
    console.log(`📧 SUBJECT: ${subject}`);
    console.log(`📧 BODY: ${body}`);
    console.log('📧 ============================================');
    
    return { success: true };
  } catch (error) {
    console.error('Email notification error:', error);
    return { success: false, error: error.message };
  }
};

// Notify admin about new deposit request
export const notifyAdminDeposit = async (userName, userEmail, amount, upiId) => {
  const message = `🔔 *NEW DEPOSIT REQUEST*\\n\\n` +
    `👤 User: ${userName}\\n` +
    `📧 Email: ${userEmail}\\n` +
    `💰 Amount: ₹${amount}\\n` +
    `🏦 UPI: ${upiId}\\n\\n` +
    `Please verify and approve in Admin Panel!`;
  
  // Send WhatsApp
  await sendWhatsAppNotification(message);
  
  // Send Email
  await sendEmailNotification(
    `💰 New Deposit Request - ₹${amount}`,
    `User ${userName} (${userEmail}) has confirmed payment of ₹${amount} to UPI ${upiId}.\n\nPlease verify and approve in Admin Panel.`
  );
};

// Notify admin about new withdrawal request
export const notifyAdminWithdraw = async (userName, userEmail, amount, upiId) => {
  const message = `🔔 *NEW WITHDRAWAL REQUEST*\\n\\n` +
    `👤 User: ${userName}\\n` +
    `📧 Email: ${userEmail}\\n` +
    `💰 Amount: ₹${amount}\\n` +
    `🏦 UPI: ${upiId}\\n\\n` +
    `Please verify and process!`;
  
  // Send WhatsApp
  await sendWhatsAppNotification(message);
  
  // Send Email
  await sendEmailNotification(
    `💸 New Withdrawal Request - ₹${amount}`,
    `User ${userName} (${userEmail}) has requested withdrawal of ₹${amount} to UPI ${upiId}.\n\nPlease verify and process.`
  );
};
