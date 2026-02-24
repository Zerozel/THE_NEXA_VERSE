// ============================================================================
// NEXA DISPATCH BOT - PROOF OF CONCEPT ENGINE
// Architecture: Node.js + whatsapp-web.js + Supabase
// Design Pattern: Finite State Machine & Broadcast-Claim Dispatch
// ============================================================================

require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { createClient } = require('@supabase/supabase-js');

// ----------------------------------------------------------------------------
// 1. SYSTEM INITIALIZATION
// ----------------------------------------------------------------------------
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const client = new Client({
  authStrategy: new LocalAuth(), // Saves the WhatsApp session so you don't scan QR every time
  puppeteer: {
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', (qr) => {
  console.log('\n=========================================');
  console.log('📱 SCAN THIS QR CODE WITH WHATSAPP 📱');
  console.log('=========================================\n');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ System Online: Nexa Bot is connected and listening for requests.');
});

// ----------------------------------------------------------------------------
// 2. THE CORE MESSAGE ROUTER
// ----------------------------------------------------------------------------
client.on('message', async message => {
  if (message.isStatus || message.from.includes('-')) return;
  
  const from = message.from; 
  const text = message.body.trim();
  
  console.log(`\n📩 INCOMING [${from.replace('@c.us', '')}]: ${text}`);
  
  try {
    // --- PHASE A: USER STATE MANAGEMENT ---
    let { data: user } = await supabase.from('users').select('*').eq('phone_number', from).single();
    
    if (!user) {
      const { data: newUser } = await supabase
        .from('users')
        .insert([{ phone_number: from, status: 'NEW' }])
        .select().single();
      user = newUser;
    } else {
      await supabase.from('users').update({ last_message: text, updated_at: new Date() }).eq('phone_number', from);
    }
    
    // --- PHASE B: GLOBAL COMMANDS ---
    if (text.toLowerCase() === 'menu' || text.toLowerCase() === 'cancel') {
      await supabase.from('users').update({ status: 'AWAITING_INTAKE_TYPE' }).eq('phone_number', from);
      return await message.reply('🔄 *Main Menu* 🛠️\n\nReply with a number:\n1️⃣ Service Call\n2️⃣ Make an Enquiry');
    }
    
    // --- PHASE C: ARTISAN FASTEST-FINGER CLAIM SYSTEM ---
    // We clean the text to remove any bold markdown (*) WhatsApp might add
    const cleanText = text.replace(/\*/g, '').toUpperCase();
    
    if (cleanText.startsWith('ACCEPT ')) {
      const jobId = cleanText.split(' ')[1]; 
      
      const { data: ticket } = await supabase.from('job_tickets').select('*').eq('job_id', jobId).single();
      
      if (!ticket) return await message.reply('❌ Invalid Job ID.');
      if (ticket.status !== 'BROADCASTED') return await message.reply('🔒 Sorry, this job has already been claimed by another artisan or cancelled.');
      
      await supabase.from('job_tickets').update({
        status: 'PENDING_CLIENT_APPROVAL',
        awarded_artisan: from
      }).eq('job_id', jobId);
      
      await message.reply('✅ *Job Claimed!* \n\nWe are asking the client for final approval. Please stand by, we will send you their contact shortly.');
      
      // FIX 1: Added .limit(1) to prevent the .single() crash since you have 3 profiles linked to one number
      const { data: artisanProfile } = await supabase
        .from('artisans')
        .select('name, rating')
        .eq('phone_number', from)
        .limit(1)
        .single();
      
      await supabase.from('users').update({ status: `AWAITING_APPROVAL_${jobId}` }).eq('phone_number', ticket.client_phone);
      
      return await client.sendMessage(
        ticket.client_phone,
        `🔔 *Good news! We found an available ${ticket.category}.*\n\n🧑‍🔧 *Personnel:* ${artisanProfile.name}\n⭐ *Rating:* ${artisanProfile.rating}/5.0\n✅ *Nexa Verified*\n\nReply *YES* to approve and receive their contact details, or *NO* to cancel.`
      );
    }
    
    // --- PHASE D: CLIENT DOUBLE-OPT-IN APPROVAL ---
    if (user.status.startsWith('AWAITING_APPROVAL_')) {
      const jobId = user.status.split('_')[2];
      
      if (text.toUpperCase() === 'YES') {
        const { data: ticket } = await supabase.from('job_tickets').select('*').eq('job_id', jobId).single();
        
        await supabase.from('job_tickets').update({ status: 'MATCHED' }).eq('job_id', jobId);
        await supabase.from('users').update({ status: 'IDLE' }).eq('phone_number', from);
        
        await message.reply(`✅ *Match Confirmed!*\n\nYour artisan is ready. Please call or message them now:\n📞 *WhatsApp:* +${ticket.awarded_artisan.replace('@c.us', '')}\n\n💬 *Need help? Chat with Nexa Customer Service for any complaints: 09045955670*`);
        
        await client.sendMessage(
          ticket.awarded_artisan,
          `✅ *Job #${jobId} Approved!*\n\nThe client is expecting you. Reach out to them immediately to arrange pricing and timing:\n📞 *Client Number:* +${ticket.client_phone.replace('@c.us', '')}\n📍 *Location:* ${ticket.location}\n📝 *Issue:* ${ticket.description}`
        );
      } else {
        await message.reply('❌ Approval cancelled. The job has been aborted. Reply "menu" to start a new search.');
        await supabase.from('users').update({ status: 'IDLE' }).eq('phone_number', from);
      }
      return;
    }
    
    // --- FIX 2: PHASE E - ENQUIRY MODE LOOP ---
    // This catches the user's inquiry text, saves it, and breaks them out of the loop
    if (user.status === 'ENQUIRY_MODE') {
      // Reset status to IDLE so they can use the bot again
      await supabase.from('users').update({ status: 'IDLE' }).eq('phone_number', from);
      return await message.reply('✅ *Your enquiry has been received!*\n\nA human agent will review this shortly. For immediate assistance or complaints, please chat directly with Nexa Customer Service at: *09045955670*\n\n(Reply "menu" anytime to start a new request).');
    }

    // --- PHASE F: THE CLIENT INTAKE FUNNEL (State Machine) ---
    
    if (user.status === 'NEW' || user.status === 'IDLE') {
      await supabase.from('users').update({ status: 'AWAITING_INTAKE_TYPE' }).eq('phone_number', from);
      return await message.reply('Welcome to *Nexa*! 🛠️\n\nAre you looking for a service or just asking a question?\nReply with a number:\n1️⃣ Service Call\n2️⃣ Make an Enquiry');
    }
    
    if (user.status === 'AWAITING_INTAKE_TYPE') {
      if (text === '1') {
        await supabase.from('users').update({ status: 'AWAITING_CATEGORY' }).eq('phone_number', from);
        return await message.reply('Great. What type of artisan do you need right now?\n\n1️⃣ Electrical\n2️⃣ Plumbing\n3️⃣ Carpentry');
      } else if (text === '2') {
        await supabase.from('users').update({ status: 'ENQUIRY_MODE' }).eq('phone_number', from);
        return await message.reply('Please type your enquiry below. A Nexa agent will review it shortly. (Reply "menu" at any time to go back).\n\n*Direct Customer Service: 09045955670*');
      } else {
        return await message.reply('❌ Invalid choice. Please reply with just the number *1* or *2*.');
      }
    }
    
    if (user.status === 'AWAITING_CATEGORY') {
      const categories = { '1': 'Electrical', '2': 'Plumbing', '3': 'Carpentry' };
      if (categories[text]) {
        await supabase.from('users').update({ status: `AWAITING_LOCATION_${categories[text]}` }).eq('phone_number', from);
        return await message.reply(`✅ You selected *${categories[text]}*.\n\nPlease reply with your exact location/address (e.g., Block A, Campus Hostel).`);
      } else {
        return await message.reply('❌ Invalid choice. Please reply with *1*, *2*, or *3*.');
      }
    }
    
    if (user.status.startsWith('AWAITING_LOCATION_')) {
      const category = user.status.split('_')[2];
      await supabase.from('users').update({ status: `AWAITING_DESC_${category}_${text}` }).eq('phone_number', from);
      return await message.reply('📍 Location saved.\n\nFinally, please briefly describe the issue (e.g., "Sparking wall socket" or "Broken pipe").');
    }
    
    if (user.status.startsWith('AWAITING_DESC_')) {
      const parts = user.status.split('_');
      const category = parts[2];
      const location = parts.slice(3).join('_'); 
      const description = text;
      
      const { data: job, error: jobError } = await supabase.from('job_tickets').insert([{
        client_phone: from,
        category: category,
        location: location,
        description: description,
        status: 'SEARCHING'
      }]).select().single();
      
      if (jobError) throw jobError;
      
      await supabase.from('users').update({ status: 'IDLE' }).eq('phone_number', from);
      await message.reply('⚙️ *Request received!* Processing your ticket...\nSearching for available artisans nearby. We will notify you once a match is found.');
      
      console.log(`🚨 INITIATING BROADCAST FOR JOB #${job.job_id} | Category: ${category}`);
      
      const { data: artisans } = await supabase
        .from('artisans')
        .select('*')
        .eq('category', category)
        .eq('is_available', true)
        .limit(3);
      
      if (!artisans || artisans.length === 0) {
        await supabase.from('job_tickets').update({ status: 'FAILED_NO_ARTISANS' }).eq('job_id', job.job_id);
        return await message.reply('⚠️ We are sorry, but there are no available artisans in that category right now. Please try again later.\n\n💬 *For further assistance, chat with Nexa Customer Service: 09045955670*');
      }
      
      const artisanNumbers = artisans.map(a => a.phone_number);
      
      await supabase.from('job_tickets').update({
        status: 'BROADCASTED',
        notified_artisans: artisanNumbers
      }).eq('job_id', job.job_id);
      
      for (const phone of artisanNumbers) {
        await client.sendMessage(
          phone,
          `🚨 *FAST MATCH ALERT!* 🚨\n\n*Job ID:* #${job.job_id}\n*Category:* ${category}\n*Location:* ${location}\n*Issue:* ${description}\n\n*(First to accept gets the client)*\nReply *ACCEPT ${job.job_id}* to claim this job.`
        );
      }
    
      return;
    }
    
  } catch (err) {
    console.error('❌ CRITICAL SYSTEM ERROR:', err);
    await message.reply('⚠️ The system encountered an error. Please reply "menu" to restart.');
  }
});

client.initialize();
