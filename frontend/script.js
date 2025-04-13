function safeRequest(url, options = {}) {
  // Set default headers if not provided
  if (!options.headers) {
    options.headers = {
      'Content-Type': 'application/json'
    };
  }
  
  return fetch(url, options)
    .then(response => {
      // First check if response is ok
      if (!response.ok) {
        // Try to parse error response as text first
        return response.text().then(text => {
          try {
            // Try to parse as JSON
            const data = JSON.parse(text);
            throw new Error(data.error || data.message || `Server error: ${response.status}`);
          } catch (e) {
            // If not valid JSON, use text or status
            if (text && text.length > 0) {
              throw new Error(`Server error: ${text}`);
            } else {
              throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }
          }
        });
      }
      
      // If response is ok, try to parse as JSON if there's content
      return response.text().then(text => {
        if (!text || text.trim() === '') {
          return {};
        }
        
        try {
          return JSON.parse(text);
        } catch (e) {
          console.warn('Response is not valid JSON:', text);
          return { message: text };
        }
      });
    });
}

function showPage(pageId) {
    // Update active sidebar item
    const menuItems = document.querySelectorAll('.sidebar li');
    menuItems.forEach(item => item.classList.remove('active'));
    event.currentTarget.classList.add('active');
  
    // Show selected page
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
  
    // Load data for the page
    if (pageId === 'dashboard') {
      loadDashboardData();
      loadRecentData();
    } else if (pageId === 'shops') {
      loadShopsData();
    } else if (pageId === 'tenants') {
      loadTenantsData();
    } else if (pageId === 'leases') {
      loadLeasesData();
    } else if (pageId === 'maintenance') {
      loadMaintenanceData();
    }
  }
  
  // Function to load dashboard data
  function loadDashboardData() {
    // Load main dashboard stats
    fetch('/api/dashboard')
      .then(response => response.json())
      .then(data => {
        document.getElementById('total-shops').textContent = data.total_shops;
        document.getElementById('occupied-shops').textContent = data.occupied_shops;
        document.getElementById('total-tenants').textContent = data.total_tenants;
        document.getElementById('pending-maintenance').textContent = data.pending_maintenance;
      })
      .catch(error => {
        console.error('Error loading dashboard data:', error);
        document.getElementById('total-shops').textContent = 'Error';
        document.getElementById('occupied-shops').textContent = 'Error';
        document.getElementById('total-tenants').textContent = 'Error';
        document.getElementById('pending-maintenance').textContent = 'Error';
      });
      
    // Load tenant-lease statistics
    fetch('/api/dashboard/tenant-stats')
      .then(response => response.json())
      .then(data => {
        // Update the numeric values
        document.getElementById('tenants-with-leases').textContent = data.tenants_with_leases;
        document.getElementById('tenants-without-leases').textContent = data.tenants_without_leases;
        document.getElementById('lease-coverage-percent').textContent = data.lease_coverage_percent + '%';
        
        // Update the progress bar
        document.getElementById('lease-coverage-bar').style.width = data.lease_coverage_percent + '%';
        
        // Change progress bar color based on coverage
        const progressBar = document.getElementById('lease-coverage-bar');
        if (data.lease_coverage_percent < 50) {
          progressBar.style.backgroundColor = '#e74c3c'; // Red
        } else if (data.lease_coverage_percent < 80) {
          progressBar.style.backgroundColor = '#f39c12'; // Yellow/Orange
        } else {
          progressBar.style.backgroundColor = '#27ae60'; // Green
        }
      })
      .catch(error => {
        console.error('Error loading tenant-lease statistics:', error);
        document.getElementById('tenants-with-leases').textContent = 'Error';
        document.getElementById('tenants-without-leases').textContent = 'Error';
        document.getElementById('lease-coverage-percent').textContent = 'Error';
      });
  }
  
  // Function to load recent data for dashboard
  function loadRecentData() {
    // Load recent leases
    fetch('/api/leases')
      .then(response => response.json())
      .then(leases => {
        const recentLeasesContainer = document.getElementById('recent-leases');
        recentLeasesContainer.innerHTML = '';
        
        if (leases.length === 0) {
          recentLeasesContainer.innerHTML = '<p>No lease data available.</p>';
        } else {
          // Display up to 3 most recent leases
          const sortedLeases = leases.sort((a, b) => new Date(b.start_date) - new Date(a.start_date)).slice(0, 3);
          sortedLeases.forEach(lease => {
            const leaseItem = document.createElement('div');
            leaseItem.className = 'item';
            leaseItem.innerHTML = `
              <div class="item-title">${lease.tenant_name} - ${lease.shop_name}</div>
              <div class="item-details">
                <span>From: ${lease.start_date}</span>
                <span>To: ${lease.end_date}</span>
                <span class="status ${lease.status.toLowerCase()}">${lease.status}</span>
              </div>
            `;
            recentLeasesContainer.appendChild(leaseItem);
          });
        }
      })
      .catch(error => {
        console.error('Error loading recent leases:', error);
        document.getElementById('recent-leases').innerHTML = '<p>Error loading lease data.</p>';
      });
    
    // Load maintenance alerts
    fetch('/api/maintenance')
      .then(response => response.json())
      .then(maintenance => {
        const maintenanceAlertsContainer = document.getElementById('maintenance-alerts');
        maintenanceAlertsContainer.innerHTML = '';
        
        if (maintenance.length === 0) {
          maintenanceAlertsContainer.innerHTML = '<p>No maintenance requests.</p>';
        } else {
          // Filter pending or in-progress maintenance requests and show top 3
          const pendingMaintenance = maintenance
            .filter(req => req.status === 'Pending' || req.status === 'In Progress')
            .sort((a, b) => {
              // Sort by priority: High, Medium, Low
              const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
              return priorityOrder[a.priority] - priorityOrder[b.priority];
            })
            .slice(0, 3);
          
          pendingMaintenance.forEach(req => {
            const maintenanceItem = document.createElement('div');
            maintenanceItem.className = 'item';
            maintenanceItem.innerHTML = `
              <div class="item-title">${req.shop_name}</div>
              <div class="item-details">
                <span>${req.description}</span>
                <span class="priority ${req.priority.toLowerCase()}">${req.priority}</span>
                <span class="status ${req.status.toLowerCase().replace(' ', '-')}">${req.status}</span>
              </div>
            `;
            maintenanceAlertsContainer.appendChild(maintenanceItem);
          });
        }
      })
      .catch(error => {
        console.error('Error loading maintenance alerts:', error);
        document.getElementById('maintenance-alerts').innerHTML = '<p>Error loading maintenance data.</p>';
      });
  }
  
  // Function to load shops data
  function loadShopsData() {
    fetch('/api/shops')
      .then(response => response.json())
      .then(shops => {
        const tableBody = document.getElementById('shops-table-body');
        tableBody.innerHTML = '';
        
        if (shops.length === 0) {
          const row = tableBody.insertRow();
          const cell = row.insertCell();
          cell.colSpan = 7;
          cell.textContent = 'No shops available.';
        } else {
          // Add rows for each shop
          shops.forEach(shop => {
            const row = tableBody.insertRow();
            row.insertCell().textContent = shop.id;
            row.insertCell().textContent = shop.name;
            row.insertCell().textContent = shop.location || 'N/A';
            row.insertCell().textContent = shop.size ? shop.size.toFixed(2) : 'N/A';
            row.insertCell().textContent = shop.rent ? `$${shop.rent.toFixed(2)}` : 'N/A';
            
            const statusCell = row.insertCell();
            statusCell.textContent = shop.status;
            statusCell.className = `status ${shop.status.toLowerCase()}`;
            
            const actionsCell = row.insertCell();
            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.className = 'edit-btn';
            editButton.onclick = () => editShop(shop.id);
            actionsCell.appendChild(editButton);
            
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.className = 'delete-btn';
            deleteButton.onclick = () => deleteShop(shop.id, shop.name);
            actionsCell.appendChild(deleteButton);
          });
        }
      })
      .catch(error => {
        console.error('Error loading shops data:', error);
        const tableBody = document.getElementById('shops-table-body');
        tableBody.innerHTML = '';
        const row = tableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 7;
        cell.textContent = 'Error loading shop data.';
      });
  }
  
  // Function to load tenants data
  function loadTenantsData() {
    fetch('/api/tenants')
      .then(response => response.json())
      .then(tenants => {
        const tableBody = document.getElementById('tenants-table-body');
        tableBody.innerHTML = '';
        
        if (tenants.length === 0) {
          const row = tableBody.insertRow();
          const cell = row.insertCell();
          cell.colSpan = 7;
          cell.textContent = 'No tenants available.';
        } else {
          // Add rows for each tenant
          tenants.forEach(tenant => {
            const row = tableBody.insertRow();
            row.insertCell().textContent = tenant.id;
            row.insertCell().textContent = tenant.name;
            row.insertCell().textContent = tenant.shop_name || 'N/A';
            row.insertCell().textContent = tenant.contact || 'N/A';
            row.insertCell().textContent = tenant.email || 'N/A';
            row.insertCell().textContent = tenant.business_type || 'N/A';
            
            // Add action buttons
            const actionsCell = row.insertCell();
            
            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.className = 'edit-btn';
            editButton.onclick = () => editTenant(tenant.id);
            actionsCell.appendChild(editButton);
            
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.className = 'delete-btn';
            deleteButton.onclick = () => deleteTenant(tenant.id, tenant.name);
            actionsCell.appendChild(deleteButton);
          });
        }
      })
      .catch(error => {
        console.error('Error loading tenants data:', error);
        const tableBody = document.getElementById('tenants-table-body');
        tableBody.innerHTML = '';
        const row = tableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 7;
        cell.textContent = 'Error loading tenant data.';
      });
  }
  
  // Function to load leases data
  function loadLeasesData() {
    fetch('/api/leases')
      .then(response => response.json())
      .then(leases => {
        const tableBody = document.getElementById('leases-table-body');
        tableBody.innerHTML = '';
        
        if (leases.length === 0) {
          const row = tableBody.insertRow();
          const cell = row.insertCell();
          cell.colSpan = 8;
          cell.textContent = 'No leases available.';
        } else {
          // Add rows for each lease
          leases.forEach(lease => {
            const row = tableBody.insertRow();
            row.insertCell().textContent = lease.id;
            row.insertCell().textContent = lease.tenant_name;
            row.insertCell().textContent = lease.shop_name;
            row.insertCell().textContent = lease.start_date;
            row.insertCell().textContent = lease.end_date;
            row.insertCell().textContent = `$${lease.rent_amount.toFixed(2)}`;
            
            const statusCell = row.insertCell();
            statusCell.textContent = lease.status;
            statusCell.className = `status ${lease.status.toLowerCase()}`;
            
            // Add action buttons
            const actionsCell = row.insertCell();
            
            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.className = 'edit-btn';
            editButton.onclick = () => editLease(lease.id);
            actionsCell.appendChild(editButton);
            
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.className = 'delete-btn';
            deleteButton.onclick = () => deleteLease(lease.id);
            actionsCell.appendChild(deleteButton);
          });
        }
      })
      .catch(error => {
        console.error('Error loading leases data:', error);
        const tableBody = document.getElementById('leases-table-body');
        tableBody.innerHTML = '';
        const row = tableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 8;
        cell.textContent = 'Error loading lease data.';
      });
  }
  
  // Function to load maintenance data
  function loadMaintenanceData() {
    showLoader();
    fetch('/api/maintenance')
      .then(response => response.json())
      .then(data => {
        const tableBody = document.getElementById('maintenance-table-body');
        tableBody.innerHTML = '';
        
        if (data.length === 0) {
          const row = tableBody.insertRow();
          const cell = row.insertCell();
          cell.colSpan = 8;
          cell.textContent = 'No maintenance requests available.';
        } else {
          data.forEach(maintenance => {
            const row = tableBody.insertRow();
            
            // Format the date to YYYY-MM-DD
            const reportedDate = new Date(maintenance.reported_date).toISOString().split('T')[0];
            const resolvedDate = maintenance.resolved_date ? new Date(maintenance.resolved_date).toISOString().split('T')[0] : '';
            
            // Create priority label with appropriate class
            const priorityClass = maintenance.priority.toLowerCase();
            const priorityLabel = `<span class="priority-label ${priorityClass}">${maintenance.priority}</span>`;
            
            // Create status label with appropriate class
            const statusClass = maintenance.status.toLowerCase().replace(' ', '-');
            const statusLabel = `<span class="status-label ${statusClass}">${maintenance.status}</span>`;
            
            row.innerHTML = `
              <td>${maintenance.id}</td>
              <td>${maintenance.shop_name}</td>
              <td>${maintenance.description}</td>
              <td>${priorityLabel}</td>
              <td>${statusLabel}</td>
              <td>${reportedDate}</td>
              <td>${resolvedDate || '-'}</td>
              <td>
                <button class="edit-btn" onclick="editMaintenance(${maintenance.id})">Edit</button>
                <button class="delete-btn" onclick="deleteMaintenance(${maintenance.id})">Delete</button>
              </td>
            `;
            
            tableBody.appendChild(row);
          });
        }
        
        hideLoader();
      })
      .catch(error => {
        console.error('Error loading maintenance data:', error);
        const tableBody = document.getElementById('maintenance-table-body');
        tableBody.innerHTML = '';
        const row = tableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 8;
        cell.textContent = 'Error loading maintenance data.';
        
        showNotification('Failed to load maintenance data', 'error');
        hideLoader();
      });
  }
  
  function updateRecentMaintenance(maintenanceData) {
    const recentMaintenanceElement = document.getElementById('recent-maintenance');
    if (!recentMaintenanceElement) return;
    
    recentMaintenanceElement.innerHTML = '';
    
    // Sort by reported date (newest first) and take top 5
    const recentMaintenance = [...maintenanceData]
      .sort((a, b) => new Date(b.reported_date) - new Date(a.reported_date))
      .slice(0, 5);
    
    if (recentMaintenance.length === 0) {
      recentMaintenanceElement.innerHTML = '<p>No maintenance requests found.</p>';
      return;
    }
    
    recentMaintenance.forEach(maintenance => {
      const priorityClass = maintenance.priority.toLowerCase();
      const statusClass = maintenance.status.toLowerCase().replace(' ', '-');
      
      const alertElement = document.createElement('div');
      alertElement.className = 'alert-item';
      alertElement.innerHTML = `
        <div class="alert-header">
          <span class="alert-title">Shop #${maintenance.shop_id}: ${maintenance.shop_name}</span>
          <span class="alert-date">${new Date(maintenance.reported_date).toLocaleDateString()}</span>
        </div>
        <p class="alert-description">${maintenance.description}</p>
        <div class="alert-footer">
          <span class="priority-label ${priorityClass}">${maintenance.priority}</span>
          <span class="status-label ${statusClass}">${maintenance.status}</span>
        </div>
      `;
      
      recentMaintenanceElement.appendChild(alertElement);
    });
  }
  
  function openMaintenanceModal(isEdit = false) {
    document.getElementById('maintenance-modal-title').textContent = isEdit ? 'Edit Maintenance Request' : 'Create Maintenance Request';
    document.getElementById('maintenance-form').reset();
    document.getElementById('maintenance-id').value = '';
    
    // Load shops for the dropdown
    loadShopsForDropdown('maintenance-shop');
    
    // Show/hide resolved date based on status
    const statusField = document.getElementById('maintenance-status');
    const resolvedDateGroup = document.getElementById('resolved-date-group');
    resolvedDateGroup.style.display = statusField.value === 'Completed' ? 'block' : 'none';
    
    // Add event listener for status change
    statusField.addEventListener('change', function() {
      resolvedDateGroup.style.display = this.value === 'Completed' ? 'block' : 'none';
    });
    
    document.getElementById('maintenance-modal').style.display = 'block';
  }
  
  function loadShopsForDropdown(dropdownId) {
    fetch('/api/shops')
      .then(response => response.json())
      .then(shops => {
        const dropdown = document.getElementById(dropdownId);
        const currentValue = dropdown.value;
        
        // Keep the first option (Select Shop) and add the shops
        const firstOption = dropdown.options[0];
        dropdown.innerHTML = '';
        dropdown.appendChild(firstOption);
        
        shops.forEach(shop => {
          const option = document.createElement('option');
          option.value = shop.id;
          option.textContent = `${shop.id}: ${shop.name}`;
          dropdown.appendChild(option);
        });
        
        if (currentValue) {
          dropdown.value = currentValue;
        }
      })
      .catch(error => {
        console.error('Error loading shops for dropdown:', error);
        showNotification('Failed to load shops', 'error');
      });
  }
  
  function closeMaintenanceModal() {
    document.getElementById('maintenance-modal').style.display = 'none';
  }
  
  function editMaintenance(maintenanceId) {
    showLoader();
    fetch(`/api/maintenance/${maintenanceId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Maintenance request not found');
        }
        return response.json();
      })
      .then(maintenance => {
        document.getElementById('maintenance-id').value = maintenance.id;
        document.getElementById('maintenance-description').value = maintenance.description;
        document.getElementById('maintenance-priority').value = maintenance.priority;
        document.getElementById('maintenance-status').value = maintenance.status;
        
        // Load shops and set selected shop
        loadShopsForDropdown('maintenance-shop');
        setTimeout(() => {
          document.getElementById('maintenance-shop').value = maintenance.shop_id;
        }, 300); // Give time for shops to load
        
        // Handle resolved date
        const resolvedDateGroup = document.getElementById('resolved-date-group');
        if (maintenance.status === 'Completed') {
          resolvedDateGroup.style.display = 'block';
          if (maintenance.resolved_date) {
            document.getElementById('maintenance-resolved-date').value = 
              new Date(maintenance.resolved_date).toISOString().split('T')[0];
          }
        } else {
          resolvedDateGroup.style.display = 'none';
        }
        
        openMaintenanceModal(true);
        hideLoader();
      })
      .catch(error => {
        console.error('Error loading maintenance details:', error);
        showNotification('Failed to load maintenance details', 'error');
        hideLoader();
      });
  }
  
  function saveMaintenance(event) {
    event.preventDefault();
    showLoader();
    
    try {
      const maintenanceId = document.getElementById('maintenance-id').value;
      const shopId = document.getElementById('maintenance-shop').value;
      const description = document.getElementById('maintenance-description').value;
      const priority = document.getElementById('maintenance-priority').value;
      const status = document.getElementById('maintenance-status').value;
      const resolvedDate = document.getElementById('maintenance-resolved-date').value;
      
      // Validate required fields
      if (!shopId) {
        throw new Error('Please select a shop');
      }
      
      if (!description) {
        throw new Error('Please provide a description');
      }
      
      if (!priority) {
        throw new Error('Please select a priority');
      }
      
      if (!status) {
        throw new Error('Please select a status');
      }
      
      // Validate that resolved date is provided if status is Completed
      if (status === 'Completed' && !resolvedDate) {
        throw new Error('Please provide a resolved date for completed maintenance');
      }
      
      const maintenanceData = {
        shop_id: parseInt(shopId, 10),
        description: description,
        priority: priority,
        status: status
      };
      
      if (status === 'Completed' && resolvedDate) {
        maintenanceData.resolved_date = resolvedDate;
      }
      
      const method = maintenanceId ? 'PUT' : 'POST';
      const url = maintenanceId ? `/api/maintenance/${maintenanceId}` : '/api/maintenance';
      
      safeRequest(url, {
        method: method,
        body: JSON.stringify(maintenanceData)
      })
        .then(data => {
          closeMaintenanceModal();
          loadMaintenanceData();
          showToast(
            `Maintenance request ${maintenanceId ? 'updated' : 'created'} successfully`,
            'success'
          );
          hideLoader();
        })
        .catch(error => {
          console.error('Error saving maintenance:', error);
          showToast(error.message || 'Failed to save maintenance request', 'error');
          hideLoader();
        });
    } catch (error) {
      console.error('Form validation error:', error);
      showToast(error.message, 'error');
      hideLoader();
    }
  }
  
  function deleteMaintenance(maintenanceId) {
    if (!confirm('Are you sure you want to delete this maintenance request?')) {
      return;
    }
    
    showLoader();
    
    safeRequest(`/api/maintenance/${maintenanceId}`, {
      method: 'DELETE'
    })
      .then(data => {
        loadMaintenanceData();
        showToast('Maintenance request deleted successfully', 'success');
        hideLoader();
      })
      .catch(error => {
        console.error('Error deleting maintenance:', error);
        showToast(error.message || 'Failed to delete maintenance request', 'error');
        hideLoader();
      });
  }
  
  // Add event listeners for maintenance
  document.addEventListener('DOMContentLoaded', function() {
    // Load maintenance data on tab switch
    const maintenanceTab = document.getElementById('maintenance-tab');
    if (maintenanceTab) {
      maintenanceTab.addEventListener('click', function() {
        loadMaintenanceData();
      });
    }
    
    // Add maintenance button
    const addMaintenanceBtn = document.getElementById('add-maintenance-btn');
    if (addMaintenanceBtn) {
      addMaintenanceBtn.addEventListener('click', function() {
        openMaintenanceModal(false);
      });
    }
    
    // Refresh maintenance button
    const refreshMaintenanceBtn = document.getElementById('refresh-maintenance-btn');
    if (refreshMaintenanceBtn) {
      refreshMaintenanceBtn.addEventListener('click', loadMaintenanceData);
    }
  });
  
  // Shop Modal Functions
  function editShop(shopId) {
    // Get shop data from API
    fetch(`/api/shops/${shopId}`)
      .then(response => response.json())
      .then(shop => {
        // Populate form with shop data
        document.getElementById('shop-id').value = shop.id;
        document.getElementById('shop-name').value = shop.name;
        document.getElementById('shop-location').value = shop.location || '';
        document.getElementById('shop-size').value = shop.size || '';
        document.getElementById('shop-rent').value = shop.rent || '';
        document.getElementById('shop-status').value = shop.status;
        
        // Update modal title
        document.getElementById('shop-modal-title').textContent = `Edit Shop: ${shop.name}`;
        
        // Show modal
        document.getElementById('shop-modal').style.display = 'block';
      })
      .catch(error => {
        console.error('Error fetching shop data:', error);
        showToast('Error loading shop data', 'error');
      });
  }
  
  function showAddShopForm() {
    // Clear form
    document.getElementById('shop-form').reset();
    document.getElementById('shop-id').value = '';
    
    // Update modal title
    document.getElementById('shop-modal-title').textContent = 'Add New Shop';
    
    // Show modal
    document.getElementById('shop-modal').style.display = 'block';
  }
  
  function closeShopModal() {
    document.getElementById('shop-modal').style.display = 'none';
  }
  
  function saveShop(event) {
    event.preventDefault();
    showLoader();
    
    try {
      // Get form data
      const shopId = document.getElementById('shop-id').value;
      const shopData = {
        name: document.getElementById('shop-name').value,
        location: document.getElementById('shop-location').value,
        size: parseFloat(document.getElementById('shop-size').value) || null,
        rent: parseFloat(document.getElementById('shop-rent').value) || null,
        status: document.getElementById('shop-status').value
      };
      
      // Validate required fields
      if (!shopData.name) {
        throw new Error('Shop name is required');
      }
      
      // If size is provided, ensure it's valid
      if (shopData.size !== null && (isNaN(shopData.size) || shopData.size <= 0)) {
        throw new Error('Shop size must be a positive number');
      }
      
      // If rent is provided, ensure it's valid
      if (shopData.rent !== null && (isNaN(shopData.rent) || shopData.rent <= 0)) {
        throw new Error('Shop rent must be a positive number');
      }
      
      // If shopId is empty, it's a new shop (POST request)
      // Otherwise, it's an update (PUT request)
      const method = shopId ? 'PUT' : 'POST';
      const url = shopId ? `/api/shops/${shopId}` : '/api/shops';
      
      safeRequest(url, {
        method: method,
        body: JSON.stringify(shopData)
      })
        .then(data => {
          // Close modal
          closeShopModal();
          
          // Show success message
          showToast(data.message || 'Shop saved successfully', 'success');
          
          // Reload shops data
          loadShopsData();
          
          // Also reload dashboard data if we're updating shops
          loadDashboardData();
          
          hideLoader();
        })
        .catch(error => {
          console.error('Error saving shop:', error);
          showToast(error.message || 'Error saving shop', 'error');
          hideLoader();
        });
    } catch (error) {
      console.error('Form validation error:', error);
      showToast(error.message, 'error');
      hideLoader();
    }
  }
  
  function deleteShop(shopId, shopName) {
    // Ask user for confirmation and whether to cascade delete
    const confirmMessage = `Delete shop "${shopName}"?\n\nChoose deletion type:`;
    const confirmResult = confirm(confirmMessage);
    
    if (!confirmResult) {
      return;
    }
    
    showLoader();
    
    const cascadeDelete = confirm("Do you want to delete all associated tenants, leases, and maintenance requests? \n\nClick 'OK' for cascade delete (removes all related data) \nClick 'Cancel' for safe delete (will fail if shop has related data)");
    
    const url = cascadeDelete ? 
      `/api/shops/${shopId}?cascade=true` : 
      `/api/shops/${shopId}`;
    
    safeRequest(url, {
      method: 'DELETE'
    })
      .then(data => {
        // Show success message
        showToast(data.message || 'Shop deleted successfully', 'success');
        
        // Reload data
        loadShopsData();
        loadTenantsData();
        loadLeasesData();
        loadMaintenanceData();
        loadDashboardData();
        
        hideLoader();
      })
      .catch(error => {
        console.error('Error deleting shop:', error);
        showToast(error.message || 'Error deleting shop', 'error');
        hideLoader();
      });
  }
  
  // Toast notification function
  function showToast(message, type = 'info') {
    try {
      const toast = document.getElementById('toast');
      if (!toast) {
        console.warn('Toast element not found, displaying message in console:', message);
        console.log(`TOAST (${type}): ${message}`);
        return;
      }
      
      toast.textContent = message;
      toast.className = 'toast';
      toast.classList.add(type);
      toast.style.display = 'block';
      
      // Auto hide after 3 seconds
      setTimeout(() => {
        toast.style.display = 'none';
      }, 3000);
    } catch (error) {
      console.error('Error showing toast:', error);
      console.log(`TOAST (${type}): ${message}`);
    }
  }
  
  // Close modal if user clicks outside of it
  window.onclick = function(event) {
    const modal = document.getElementById('shop-modal');
    if (event.target === modal) {
      closeShopModal();
    }
  }
  
  // Initialize
  document.addEventListener('DOMContentLoaded', function() {
    // Load initial data
    loadDashboardData();
    loadRecentData();
    
    // Check for expired leases on page load
    checkExpiredLeases();
    
    // Set up interval to check for expired leases every hour
    setInterval(checkExpiredLeases, 3600000);
  });
  
  // Tenant Modal Functions
  function editTenant(tenantId) {
    // First load shop data for the dropdown
    Promise.all([
      fetch('/api/shops'),
      fetch('/api/tenants'),
      fetch('/api/leases')
    ])
      .then(responses => Promise.all(responses.map(res => res.json())))
      .then(([shops, tenants, leases]) => {
        const shopSelect = document.getElementById('tenant-modal-shop');
        shopSelect.innerHTML = '<option value="">Select Shop</option>';
        
        shops.forEach(shop => {
          const option = document.createElement('option');
          option.value = shop.id;
          option.textContent = shop.name;
          shopSelect.appendChild(option);
        });
        
        // Then get tenant data
        return fetch(`/api/tenants/${tenantId}`)
          .then(response => response.json())
          .then(tenant => {
            // Find existing lease for this tenant
            const tenantLease = leases.find(lease => 
              lease.tenant_id === tenant.id && lease.status === 'Active'
            );
            
            // Populate form with tenant data
            document.getElementById('tenant-id').value = tenant.id;
            document.getElementById('tenant-modal-name').value = tenant.name;
            document.getElementById('tenant-modal-contact').value = tenant.contact || '';
            document.getElementById('tenant-modal-email').value = tenant.email || '';
            document.getElementById('tenant-modal-business').value = tenant.business_type || '';
            document.getElementById('tenant-modal-shop').value = tenant.shop_id || '';
            
            // Always show lease info section when editing a tenant
            const leaseInfoSection = document.querySelector('.lease-info-section');
            if (leaseInfoSection) {
              leaseInfoSection.style.display = 'block';
            }
            
            // If there's an existing lease, populate the lease fields
            if (tenantLease) {
              document.getElementById('lease-start-date').value = tenantLease.start_date;
              document.getElementById('lease-end-date').value = tenantLease.end_date;
              document.getElementById('lease-rent-amount').value = tenantLease.rent_amount;
            } else {
              // Set default lease dates if no existing lease
              const today = new Date().toISOString().split('T')[0];
              const nextYear = new Date();
              nextYear.setFullYear(nextYear.getFullYear() + 1);
              
              document.getElementById('lease-start-date').value = today;
              document.getElementById('lease-end-date').value = nextYear.toISOString().split('T')[0];
            }
            
            // Update button text
            const saveButton = document.querySelector('#tenant-form .save-btn');
            if (saveButton) {
              saveButton.textContent = 'Save Tenant with Lease';
            }
            
            // Update modal title
            document.getElementById('tenant-modal-title').textContent = `Edit Tenant: ${tenant.name}`;
            
            // Show modal
            document.getElementById('tenant-modal').style.display = 'block';
            
            return tenant;
          });
      })
      .catch(error => {
        console.error('Error fetching tenant data:', error);
        showToast('Error loading tenant data', 'error');
      });
  }
  
  function showAddTenantForm() {
    // Get modal elements
    const modal = document.getElementById('tenant-modal');
    const form = document.getElementById('tenant-form');
    const tenantId = document.getElementById('tenant-id');
    const simpleLeaseCheckbox = document.getElementById('simple-lease-checkbox');
    const leaseSection = document.getElementById('lease-info-section');
    const saveBtn = form.querySelector('.save-btn');
    
    // Reset the form
    form.reset();
    tenantId.value = '';
    
    // Hide the lease section initially as we're using the simple form by default
    simpleLeaseCheckbox.checked = true;
    leaseSection.style.display = 'none';
    
    // Load shops for the dropdown
    fetch('/api/shops')
      .then(response => response.json())
      .then(shops => {
        const shopSelect = document.getElementById('tenant-modal-shop');
        shopSelect.innerHTML = '<option value="">Select Shop</option>';
        
        shops.forEach(shop => {
          const option = document.createElement('option');
          option.value = shop.id;
          option.textContent = shop.name;
          shopSelect.appendChild(option);
        });
        
        // Set default dates
        const today = new Date();
        const nextYear = new Date(today);
        nextYear.setFullYear(today.getFullYear() + 1);
        
        const startDate = document.getElementById('lease-start-date');
        const endDate = document.getElementById('lease-end-date');
        
        if (startDate && endDate) {
          startDate.valueAsDate = today;
          endDate.valueAsDate = nextYear;
        }
        
        // Show the modal
        modal.style.display = 'block';
      })
      .catch(error => {
        console.error('Error loading shops:', error);
        showToast('Failed to load shops', 'error');
      });
    
    // Add event listener to the checkbox
    simpleLeaseCheckbox.addEventListener('change', toggleLeaseSection);
  }
  
  // Toggle lease section based on checkbox
  function toggleLeaseSection() {
    const isSimpleForm = document.getElementById('simple-lease-checkbox').checked;
    const leaseSection = document.getElementById('lease-info-section');
    
    if (isSimpleForm) {
      leaseSection.style.display = 'none';
      document.querySelector('#tenant-form .save-btn').textContent = 'Save Tenant';
    } else {
      leaseSection.style.display = 'block';
      document.querySelector('#tenant-form .save-btn').textContent = 'Save Tenant with Lease';
    }
  }
  
  // Save tenant data
  function saveTenant() {
    const isSimpleForm = document.getElementById('simple-lease-checkbox').checked;
    
    if (isSimpleForm) {
      saveTenantSimple();
    } else {
      saveTenantWithLease();
    }
  }
  
  // Save tenant with detailed lease information
  function saveTenantWithLease() {
    const tenantId = document.getElementById('tenant-id').value;
    const name = document.getElementById('tenant-modal-name').value;
    const contact = document.getElementById('tenant-modal-contact').value;
    const email = document.getElementById('tenant-modal-email').value;
    const business = document.getElementById('tenant-modal-business').value;
    const shopId = document.getElementById('tenant-modal-shop').value;
    const startDate = document.getElementById('lease-start-date').value;
    const endDate = document.getElementById('lease-end-date').value;
    const rentAmount = document.getElementById('lease-rent-amount').value;
    
    // Validate required fields
    if (!name || !shopId || !startDate || !endDate || !rentAmount) {
      showToast('Please fill in all required fields', 'error');
      return;
    }
    
    // Prepare tenant data
    const tenantData = {
      name: name,
      contact_number: contact,
      email: email,
      business_type: business,
      shop_id: shopId
    };
    
    // Prepare lease data
    const leaseData = {
      shop_id: shopId,
      start_date: startDate,
      end_date: endDate,
      rent_amount: rentAmount
    };
    
    // Check if we're updating or creating
    const method = tenantId ? 'PUT' : 'POST';
    const url = tenantId ? `/api/tenants/${tenantId}` : '/api/tenants';
    
    // Save the tenant first
    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tenantData)
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to save tenant');
        }
        return response.json();
      })
      .then(data => {
        // Use the tenant ID (either existing or new) for the lease
        const newTenantId = tenantId || data.id;
        leaseData.tenant_id = newTenantId;
        
        // Now create/update the lease
        return fetch('/api/leases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leaseData)
        });
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to save lease');
        }
        return response.json();
      })
      .then(() => {
        showToast('Tenant and lease saved successfully!', 'success');
        closeTenantModal();
        loadTenantsData();
        loadLeasesData();
      })
      .catch(error => {
        console.error('Error:', error);
        showToast(error.message, 'error');
      });
  }
  
  // Save tenant with simplified lease (1-year default using shop's rent)
  function saveTenantSimple() {
    showLoader();
    
    const tenantId = document.getElementById('tenant-id').value;
    const name = document.getElementById('tenant-modal-name').value;
    const contact = document.getElementById('tenant-modal-contact').value;
    const email = document.getElementById('tenant-modal-email').value;
    const business = document.getElementById('tenant-modal-business').value;
    const shopId = document.getElementById('tenant-modal-shop').value;
    
    // Validate required fields
    if (!name || !shopId) {
      showToast('Please fill in all required fields', 'error');
      hideLoader();
      return;
    }
    
    // Prepare tenant data
    const tenantData = {
      name: name,
      contact: contact,
      email: email,
      business_type: business,
      shop_id: parseInt(shopId, 10) // Ensure shop_id is an integer
    };
    
    // Use the tenant-simple endpoint for new tenants to create with default lease
    if (!tenantId) {
      // For new tenants, use the tenant-simple endpoint
      safeRequest('/api/tenant-simple', {
        method: 'POST',
        body: JSON.stringify(tenantData)
      })
      .then(data => {
        showToast('Tenant created with default lease successfully!', 'success');
        closeTenantModal();
        loadTenantsData();
        loadLeasesData();
        loadShopsData();
        hideLoader();
      })
      .catch(error => {
        console.error('Error:', error);
        showToast(error.message || 'Failed to save tenant', 'error');
        hideLoader();
      });
    } else {
      // For existing tenants, follow the original update flow
      const method = 'PUT';
      const url = `/api/tenants/${tenantId}`;
      
      // Save the tenant
      safeRequest(url, {
        method: method,
        body: JSON.stringify(tenantData)
      })
      .then(data => {
        // Calculate dates for 1-year lease
        const today = new Date();
        const oneYearLater = new Date();
        oneYearLater.setFullYear(today.getFullYear() + 1);
        
        const startDate = today.toISOString().split('T')[0];
        const endDate = oneYearLater.toISOString().split('T')[0];
        
        // Get shop rent
        return safeRequest(`/api/shops/${shopId}`)
          .then(shopData => {
            // Create lease with shop's rent amount
            const leaseData = {
              tenant_id: parseInt(tenantId, 10),
              shop_id: parseInt(shopId, 10),
              start_date: startDate,
              end_date: endDate,
              rent_amount: shopData.rent
            };
            
            // Create the lease
            return safeRequest('/api/leases', {
              method: 'POST',
              body: JSON.stringify(leaseData)
            });
          });
      })
      .then(() => {
        showToast('Tenant updated with lease successfully!', 'success');
        closeTenantModal();
        loadTenantsData();
        loadLeasesData();
        loadShopsData();
        hideLoader();
      })
      .catch(error => {
        console.error('Error:', error);
        showToast(error.message || 'Failed to save tenant', 'error');
        hideLoader();
      });
    }
  }
  
  function closeTenantModal() {
    document.getElementById('tenant-modal').style.display = 'none';
    
    // Remove the change event listener to avoid duplicates
    const checkbox = document.getElementById('simple-lease-checkbox');
    if (checkbox) {
      checkbox.removeEventListener('change', toggleLeaseSection);
    }
  }
  
  function deleteTenant(tenantId, tenantName) {
    // First check if tenant has active leases
    showLoader();
    
    safeRequest('/api/leases')
      .then(leases => {
        const hasActiveLeases = leases.some(lease => 
          lease.tenant_id === parseInt(tenantId) && lease.status === 'Active'
        );
        
        if (hasActiveLeases) {
          throw new Error('Cannot delete tenant with active lease. Please delete the lease first.');
        }
        
        // No active leases, proceed with deletion
        const confirmResult = confirm(`Are you sure you want to delete tenant "${tenantName}"?`);
        
        if (!confirmResult) {
          hideLoader();
          return Promise.reject(new Error('Deletion cancelled'));
        }
        
        return safeRequest(`/api/tenants/${tenantId}`, {
          method: 'DELETE'
        });
      })
      .then(() => {
        showToast('Tenant deleted successfully', 'success');
        
        loadTenantsData();
        loadLeasesData();
        loadShopsData();
        loadDashboardData();
        
        hideLoader();
      })
      .catch(error => {
        if (error.message !== 'Deletion cancelled') {
          console.error('Error deleting tenant:', error);
          showToast(error.message || 'Error deleting tenant', 'error');
        }
        hideLoader();
      });
  }
  
  // Lease Modal Functions
  function editLease(leaseId) {
    // First load shops and tenants data for the dropdowns
    Promise.all([
      fetch('/api/shops'),
      fetch('/api/tenants')
    ])
      .then(responses => Promise.all(responses.map(res => res.json())))
      .then(([shops, tenants]) => {
        // Populate shop dropdown
        const shopSelect = document.getElementById('lease-modal-shop');
        shopSelect.innerHTML = '';
        
        shops.forEach(shop => {
          const option = document.createElement('option');
          option.value = shop.id;
          option.textContent = shop.name;
          shopSelect.appendChild(option);
        });
        
        // Populate tenant dropdown
        const tenantSelect = document.getElementById('lease-modal-tenant');
        tenantSelect.innerHTML = '';
        
        tenants.forEach(tenant => {
          const option = document.createElement('option');
          option.value = tenant.id;
          option.textContent = tenant.name;
          tenantSelect.appendChild(option);
        });
        
        // Get lease data
        return fetch(`/api/leases/${leaseId}`);
      })
      .then(response => response.json())
      .then(lease => {
        // Populate form with lease data
        document.getElementById('lease-id').value = lease.id;
        document.getElementById('lease-modal-tenant').value = lease.tenant_id;
        document.getElementById('lease-modal-shop').value = lease.shop_id;
        document.getElementById('lease-modal-start').value = lease.start_date;
        document.getElementById('lease-modal-end').value = lease.end_date;
        document.getElementById('lease-modal-rent').value = lease.rent_amount;
        document.getElementById('lease-modal-status').value = lease.status;
        
        // Update modal title
        document.getElementById('lease-modal-title').textContent = 'Edit Lease';
        
        // Show modal
        document.getElementById('lease-modal').style.display = 'block';
      })
      .catch(error => {
        console.error('Error fetching lease data:', error);
        showToast('Error loading lease data', 'error');
      });
  }
  
  function showAddLeaseForm() {
    // Load shops and tenants data for the dropdowns
    Promise.all([
      fetch('/api/shops'),
      fetch('/api/tenants')
    ])
      .then(responses => Promise.all(responses.map(res => res.json())))
      .then(([shops, tenants]) => {
        // Check if there are any tenants available
        if (tenants.length === 0) {
          showToast('You must add a tenant before creating a lease', 'error');
          return;
        }

        // Populate shop dropdown
        const shopSelect = document.getElementById('lease-modal-shop');
        shopSelect.innerHTML = '';
        
        shops.forEach(shop => {
          const option = document.createElement('option');
          option.value = shop.id;
          option.textContent = shop.name;
          shopSelect.appendChild(option);
        });
        
        // Populate tenant dropdown
        const tenantSelect = document.getElementById('lease-modal-tenant');
        tenantSelect.innerHTML = '';
        
        tenants.forEach(tenant => {
          const option = document.createElement('option');
          option.value = tenant.id;
          option.textContent = tenant.name;
          tenantSelect.appendChild(option);
        });
        
        // Clear form
        document.getElementById('lease-form').reset();
        document.getElementById('lease-id').value = '';
        
        // Set default dates
        const today = new Date().toISOString().split('T')[0];
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        
        document.getElementById('lease-modal-start').value = today;
        document.getElementById('lease-modal-end').value = nextYear.toISOString().split('T')[0];
        document.getElementById('lease-modal-status').value = 'Active';
        
        // Update modal title
        document.getElementById('lease-modal-title').textContent = 'Add New Lease';
        
        // Show modal
        document.getElementById('lease-modal').style.display = 'block';
      })
      .catch(error => {
        console.error('Error loading form data:', error);
        showToast('Error loading form data', 'error');
      });
  }
  
  function closeLeaseModal() {
    document.getElementById('lease-modal').style.display = 'none';
  }
  
  function saveLease(event) {
    event.preventDefault();
    showLoader();
    
    try {
      // Get form data
      const leaseId = document.getElementById('lease-id').value;
      const leaseData = {
        tenant_id: document.getElementById('lease-modal-tenant').value,
        shop_id: document.getElementById('lease-modal-shop').value,
        start_date: document.getElementById('lease-modal-start').value,
        end_date: document.getElementById('lease-modal-end').value,
        rent_amount: parseFloat(document.getElementById('lease-modal-rent').value),
        status: document.getElementById('lease-modal-status').value
      };
      
      // Validate required fields
      if (!leaseData.tenant_id) {
        throw new Error('Tenant selection is required');
      }
      if (!leaseData.shop_id) {
        throw new Error('Shop selection is required');
      }
      if (!leaseData.start_date) {
        throw new Error('Start date is required');
      }
      if (!leaseData.end_date) {
        throw new Error('End date is required');
      }
      if (isNaN(leaseData.rent_amount) || leaseData.rent_amount <= 0) {
        throw new Error('Rent amount must be a positive number');
      }
      
      // Convert IDs to integers
      leaseData.tenant_id = parseInt(leaseData.tenant_id, 10);
      leaseData.shop_id = parseInt(leaseData.shop_id, 10);
      
      // Validate date logic
      if (new Date(leaseData.end_date) <= new Date(leaseData.start_date)) {
        throw new Error('End date must be after start date');
      }
      
      // Prepare the request
      const method = leaseId ? 'PUT' : 'POST';
      const url = leaseId ? `/api/leases/${leaseId}` : '/api/leases';
      
      // Use safeRequest to handle errors better
      safeRequest(url, {
        method: method,
        body: JSON.stringify(leaseData)
      })
      .then(data => {
        // Close modal
        closeLeaseModal();
        
        // Show success message
        showToast(data.message || 'Lease saved successfully', 'success');
        
        // Reload data
        loadLeasesData();
        loadTenantsData();
        loadShopsData();
        loadDashboardData();
      })
      .catch(error => {
        console.error('Error saving lease:', error);
        showToast(error.message || 'Error saving lease', 'error');
      })
      .finally(() => {
        hideLoader();
      });
    } catch (error) {
      console.error('Form validation error:', error);
      showToast(error.message, 'error');
      hideLoader();
    }
  }
  
  function deleteLease(leaseId) {
    if (confirm(`Are you sure you want to delete this lease? This will also remove the associated tenant.`)) {
      showLoader();
      
      fetch(`/api/leases/${leaseId}`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch lease details');
          }
          return response.json();
        })
        .then(lease => {
          const tenantId = lease.tenant_id;
          
          // First delete the lease with a delay
          setTimeout(() => {
            fetch(`/api/leases/${leaseId}`, {
              method: 'DELETE'
            })
            .then(response => {
              if (!response.ok) {
                throw new Error('Failed to delete lease');
              }
              return response.json();
            })
            .then(() => {
              // Add another delay before deleting tenant
              setTimeout(() => {
                // Then delete the tenant - use cascade=true to bypass lease check
                fetch(`/api/tenants/${tenantId}?cascade=true`, {
                  method: 'DELETE'
                })
                .then(response => {
                  if (!response.ok) {
                    throw new Error('Failed to delete tenant');
                  }
                  return response.json();
                })
                .then(() => {
                  // Show success message
                  showToast('Lease and associated tenant deleted successfully', 'success');
                  
                  // Reload data
                  loadLeasesData();
                  loadTenantsData();
                  loadShopsData();
                  loadDashboardData();
                  
                  hideLoader();
                })
                .catch(error => {
                  console.error('Error deleting tenant:', error);
                  showToast(error.message || 'Error deleting tenant', 'error');
                  hideLoader();
                });
              }, 500); // Delay before deleting tenant
            })
            .catch(error => {
              console.error('Error deleting lease:', error);
              showToast(error.message || 'Error deleting lease', 'error');
              hideLoader();
            });
          }, 500); // Delay before deleting lease
        })
        .catch(error => {
          console.error('Error fetching lease details:', error);
          showToast(error.message || 'Error fetching lease details', 'error');
          hideLoader();
        });
    }
  }
  
  // Check and update expired leases
  function checkExpiredLeases() {
    fetch('/api/leases/expire-check', {
      method: 'POST'
    })
      .then(response => response.json())
      .then(data => {
        if (data.message.includes('Updated')) {
          showToast(data.message, 'info');
          loadLeasesData();
          loadTenantsData();
          loadDashboardData();
        }
      })
      .catch(error => {
        console.error('Error checking expired leases:', error);
      });
  }
  
  // Show loader function
  function showLoader() {
    try {
      const loader = document.getElementById('loader');
      if (!loader) {
        console.warn('Loader element not found');
        return;
      }
      loader.style.display = 'block';
    } catch (error) {
      console.error('Error showing loader:', error);
    }
  }
  
  // Hide loader function
  function hideLoader() {
    try {
      const loader = document.getElementById('loader');
      if (!loader) {
        console.warn('Loader element not found');
        return;
      }
      loader.style.display = 'none';
    } catch (error) {
      console.error('Error hiding loader:', error);
    }
  }
  
  // Show notification function
  function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = 'notification';
    notification.classList.add(type);
    notification.style.display = 'block';
    
    // Auto hide after 3 seconds
    setTimeout(() => {
      notification.style.display = 'none';
    }, 3000);
  }
  
  function showAddMaintenanceForm() {
    openMaintenanceModal(false);
  }
  
  