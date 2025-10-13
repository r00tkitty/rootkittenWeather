import os  # For file path handling
def aantal_dagen(input_file):  # Function to count number of days in input file.
    try:
        with open(input_file, 'r') as f: # Open the input file as read-only
            lines = f.readlines() # Read all lines
        # Skip header line
        return len(lines) - 1 
    except FileNotFoundError:  # Handle file not found error
        print("Error: input file not found.")
        return 0 # Return 0 if file not found


def auto_bereken(input_file, output_file): # Automatically calculate actuator values and save them to output file.
    try:
        with open(input_file, 'r') as f:
            lines = [line for line in f.readlines()[1:] if line.strip()]  # skip header line and empty lines

        with open(output_file, 'w') as out:
            for line in lines: # Process each line
                date, num_people, setpoint, outside, precip = line.strip().split() # Split line into variables
                num_people = int(num_people) # Convert to integer
                setpoint = float(setpoint)  # Convert to float
                outside = float(outside) # Convert to float
                precip = float(precip) # Convert to float

                # CV-ketel logic
                diff = setpoint - outside # Calculate difference
                if diff >= 20:
                    cv = 100
                elif diff >= 10:
                    cv = 50
                else:
                    cv = 0

                # Ventilatie logic
                ventilation = min(num_people + 1, 4) # Max 4

                # Bewatering logic
                watering = precip < 3  # True if less than 3mm

                out.write(f"{date};{cv};{ventilation};{str(watering)}\n") # Write to output file

        # Success
        return {"status": "ok"}
    except FileNotFoundError:
        return {"status": "error", "message": "input file not found"}
    except Exception as e:
        return {"status": "error", "message": f"An error occurred: {e}"}


def overwrite_settings(output_file, date_to_change=None, system_choice=None, new_value=None): 
    """
    Overwrite a specific actuator value for a specific date.
    Works both via console input and via parameters.
    """
    try:
        # If any argument is missing (e.g. console mode), ask the user for it.
        if date_to_change is None:
            date_to_change = input("Enter date (dd-mm-yyyy): ") # Get date from user
        if system_choice is None:
            system_choice = input("Select system (1=CV, 2=Ventilation, 3=Bewatering): ") # Get system choice from user
        if new_value is None: 
            new_value = input("Enter new value: ") # Get new value from user

        with open(output_file, 'r') as f: # Read the existing output file
            lines = f.readlines()

        found = False
        with open(output_file, 'w') as f: # Open the file for writing (this will overwrite it)
            for line in lines: # Process each line
                date, cv, vent, water = line.strip().split(';') # Split line into variables
                if date == date_to_change: # If the date matches
                    found = True # Mark as found
                    if system_choice == '1': # CV-ketel
                        if not new_value.isdigit() or not (0 <= int(new_value) <= 100):    # Validate input
                            print("Invalid value for CV-ketel (must be 0–100).") 
                            return -3 # Return error code
                        cv = str(new_value)
                    elif system_choice == '2': # Ventilatie
                        if not new_value.isdigit() or not (0 <= int(new_value) <= 4):  # Validate input
                            print("Invalid value for ventilation (must be 0–4).") 
                            return -3 # Return error code
                        vent = str(new_value) 
                    elif system_choice == '3': # Bewatering
                        if new_value not in ('0', '1'): # Validate input
                            print("Invalid value for watering (must be 0 or 1).") 
                            return -3 # Return error code
                        water = 'True' if new_value == '1' else 'False' 
                    else:
                        print("Invalid system number.") 
                        return -3 # Return error code
                    print(f"Updated {date} → {cv};{vent};{water}") # Confirmation message
                f.write(f"{date};{cv};{vent};{water}\n") # Write the (possibly updated) line back to the file

        if not found:
            print("Date not found.")
            return -1

        return 0

    except FileNotFoundError:
        print("Error: output file not found.")
        return -1


# This is for the command-line interface version of the controller.
def smart_app_controller():
    # Main controller function to interact with user.
    base_dir = os.path.dirname(__file__)
    input_file = os.path.join(base_dir, "input.txt")
    output_file = os.path.join(base_dir, "output.txt")

    while True:
        print("\nSMART APP CONTROLLER")
        print("1. Show number of days")
        print("2. Auto calculate actuators and write to output")
        print("3. Overwrite actuator value")
        print("4. Exit")

        choice = input("Choose an option: ")
        if choice == "1":
            days = aantal_dagen(input_file)
            print(f"There are {days} days in the input file.")
        elif choice == "2":
            auto_bereken(input_file, output_file)
        elif choice == "3":
            overwrite_settings(output_file)
        elif choice == "4":
            print("Goodbye!")
            break
        else:
            print("Invalid choice. Try again.")


if __name__ == "__main__":
    smart_app_controller() # Run the controller if this file is executed directly.
