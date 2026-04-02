-- Initialize default page content records for separate tables

-- Privacy Policy
INSERT INTO privacy_policy (id, title, content, created_at, updated_at, updated_by)
VALUES (
    gen_random_uuid(),
    'Privacy Policy',
    '<h2>Privacy Policy</h2>
<p>Your privacy is important to us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website.</p>

<h3>1. Information We Collect</h3>
<p>We may collect information about you in a variety of ways. The information we may collect on the Site includes:</p>
<ul>
  <li><strong>Personal Data:</strong> Name, email address, phone number, and other identifiable information you voluntarily provide when you register or make purchases.</li>
  <li><strong>Payment Information:</strong> Credit card details and other payment information needed to process transactions.</li>
  <li><strong>Usage Data:</strong> Browser type, IP address, pages visited, and time spent on our Site.</li>
</ul>

<h3>2. Use of Your Information</h3>
<p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Site to:</p>
<ul>
  <li>Process your transactions and send related information.</li>
  <li>Email regarding your account or order.</li>
  <li>Fulfill and manage purchases, orders, payments, and other transactions related to the Site.</li>
  <li>Generate a personal profile about you to make future visits to the Site more personalized.</li>
  <li>Increase the efficiency and operation of the Site.</li>
</ul>

<h3>3. Disclosure of Your Information</h3>
<p>We may share or disclose your information in the following situations:</p>
<ul>
  <li>By law or to protect our rights.</li>
  <li>To third party service providers who perform services on our behalf.</li>
  <li>If we are involved in a merger, acquisition, or asset sale.</li>
</ul>

<h3>4. Security of Your Information</h3>
<p>We use administrative, technical, and physical security measures to protect your personal information. However, no transmission over the Internet is 100% secure.</p>

<h3>5. Contact Us</h3>
<p>If you have questions or comments about this Privacy Policy, please contact us at privacy@ticketer.lk</p>',
    NOW(),
    NOW(),
    'SYSTEM'
) ON CONFLICT DO NOTHING;

-- Terms and Conditions
INSERT INTO terms_and_conditions (id, title, content, created_at, updated_at, updated_by)
VALUES (
    gen_random_uuid(),
    'Terms and Conditions',
    '<h2>Terms and Conditions</h2>
<p>These Terms and Conditions constitute a legally binding agreement made between you and Ticketer.lk ("we," "us," "our," or the "Company").</p>

<h3>1. Agreement to Terms</h3>
<p>By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.</p>

<h3>2. Use License</h3>
<p>Permission is granted to temporarily download one copy of the materials (information or software) on our website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:</p>
<ul>
  <li>Modifying or copying the materials</li>
  <li>Using the materials for any commercial purpose or for any public display</li>
  <li>Attempting to decompile or reverse engineer any software</li>
  <li>Removing any copyright or other proprietary notations from the materials</li>
  <li>Transferring the materials to another person or "mirroring" the materials on any other server</li>
</ul>

<h3>3. Disclaimer</h3>
<p>The materials on our website are provided "as is". We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>

<h3>4. Limitations</h3>
<p>In no event shall our company or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on our website.</p>

<h3>5. Contact Us</h3>
<p>If you have questions about these Terms and Conditions, please contact us at support@ticketer.lk</p>',
    NOW(),
    NOW(),
    'SYSTEM'
) ON CONFLICT DO NOTHING;

-- Cookie Policy
INSERT INTO cookie_policy (id, title, content, created_at, updated_at, updated_by)
VALUES (
    gen_random_uuid(),
    'Cookie Policy',
    '<h2>Cookie Policy</h2>
<p>This Cookie Policy explains what cookies are and how we use them on our website.</p>

<h3>1. What Are Cookies?</h3>
<p>Cookies are small text files that are placed on your computer or mobile device when you visit our website. They are widely used to enhance user experience and improve website functionality.</p>

<h3>2. Types of Cookies We Use</h3>
<h4>Essential Cookies</h4>
<p>These cookies are necessary for the website to function properly. They enable core functionality such as security, network management, and accessibility.</p>

<h4>Performance Cookies</h4>
<p>These cookies collect information about how you use our website, such as which pages you visit and which links you click. This helps us improve website performance.</p>

<h4>Functional Cookies</h4>
<p>These cookies allow us to remember your preferences and provide enhanced features such as personalized content and language preferences.</p>

<h4>Marketing Cookies</h4>
<p>These cookies are used to track your online activities and display advertisements that are relevant to your interests.</p>

<h3>3. Managing Cookies</h3>
<p>You can control and/or delete cookies as you wish. Most browsers allow you to refuse cookies or alert you when cookies are being sent.</p>

<h3>4. Contact Us</h3>
<p>If you have questions about this Cookie Policy, please contact us at support@ticketer.lk</p>',
    NOW(),
    NOW(),
    'SYSTEM'
) ON CONFLICT DO NOTHING;

-- FAQ
INSERT INTO faq (id, title, content, created_at, updated_at, updated_by)
VALUES (
    gen_random_uuid(),
    'Frequently Asked Questions',
    '<div class="faq-item">
  <h5>What is Ticketer.lk?</h5>
  <p>Ticketer.lk is an online ticket booking platform that allows users to purchase tickets for events, concerts, shows, and other entertainment venues.</p>
</div>

<div class="faq-item">
  <h5>How do I create an account?</h5>
  <p>Click on the "Create Account" or "Register" button on our homepage. Fill in your personal information, create a secure password, and verify your email address.</p>
</div>

<div class="faq-item">
  <h5>How do I book tickets?</h5>
  <p>Select an event, choose your preferred date and time, select your seats, and proceed to checkout. Complete your payment, and your tickets will be sent to your email address.</p>
</div>

<div class="faq-item">
  <h5>What payment methods do you accept?</h5>
  <p>We accept credit cards (Visa, Mastercard), debit cards, and online payment gateways including popular digital wallets and local payment methods.</p>
</div>

<div class="faq-item">
  <h5>Can I cancel my tickets?</h5>
  <p>Cancellation policies depend on the specific event. Please check the event details page for the cancellation terms and conditions.</p>
</div>

<div class="faq-item">
  <h5>How will I receive my tickets?</h5>
  <p>Your tickets will be sent to your registered email address immediately after purchase. You can also download them from your account dashboard.</p>
</div>

<div class="faq-item">
  <h5>Is my payment information secure?</h5>
  <p>Yes, we use SSL encryption and PCI-DSS compliance to protect your payment information. Your credit card details are never stored on our servers.</p>
</div>

<div class="faq-item">
  <h5>How do I contact customer support?</h5>
  <p>You can reach our customer support team via email at support@ticketer.lk or through our contact form. We typically respond within 24 hours.</p>
</div>',
    NOW(),
    NOW(),
    'SYSTEM'
) ON CONFLICT DO NOTHING;

