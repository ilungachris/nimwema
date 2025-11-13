      // Parse recipients
      let recipients = [];
      try {
        const recipientsResult = await db.query('SELECT * FROM order_recipients WHERE order_id = $1', [orderId]);
        console.log('Recipients query successful, found:', recipientsResult.rowCount);
        recipients = recipientsResult.rows;
        console.log('Found recipients:', recipients.length);
      } catch (err) {
        console.error('Error querying recipients:', err.message);
        recipients = [];
      }
