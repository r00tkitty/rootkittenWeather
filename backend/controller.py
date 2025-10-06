import os
def aantal_dagen(input_file):
    """Count how many data rows (days) are in the input file."""
    try:
        with open(input_file, 'r') as f:
            lines = f.readlines()
        # Skip header line
        return len(lines) - 1
    except FileNotFoundError:
        print("Error: input file not found.")
        return 0


def auto_bereken(input_file, output_file):
    """Automatically calculate actuator values and save them to output file."""
    try:
        with open(input_file, 'r') as f:
            lines = f.readlines()[1:]  # skip header line

        with open(output_file, 'w') as out:
            for line in lines:
                date, num_people, setpoint, outside, precip = line.strip().split()
                num_people = int(num_people)
                setpoint = float(setpoint)
                outside = float(outside)
                precip = float(precip)

                # CV-ketel logic
                diff = setpoint - outside
                if diff >= 20:
                    cv = 100
                elif diff >= 10:
                    cv = 50
                else:
                    cv = 0

                # Ventilatie logic
                ventilation = min(num_people + 1, 4)

                # Bewatering logic
                watering = precip < 3  # True if less than 3mm

                out.write(f"{date};{cv};{ventilation};{str(watering)}\n")

        print(f"Actuator data written to {output_file}")
    except FileNotFoundError:
        print("Error: input file not found.")


def overwrite_settings(output_file):
    """Allow user to overwrite a specific actuator value for a specific date."""
    try:
        date_to_change = input("Enter date (dd-mm-yyyy): ")
        system_choice = input("Select system (1=CV, 2=Ventilation, 3=Bewatering): ")
        new_value = input("Enter new value: ")

        with open(output_file, 'r') as f:
            lines = f.readlines()

        found = False
        with open(output_file, 'w') as f:
            for line in lines:
                date, cv, vent, water = line.strip().split(';')
                if date == date_to_change:
                    found = True
                    if system_choice == '1':
                        if not new_value.isdigit() or not (0 <= int(new_value) <= 100):
                            print("Invalid value for CV-ketel (must be 0–100).")
                            return -3
                        cv = str(new_value)
                    elif system_choice == '2':
                        if not new_value.isdigit() or not (0 <= int(new_value) <= 4):
                            print("Invalid value for ventilation (must be 0–4).")
                            return -3
                        vent = str(new_value)
                    elif system_choice == '3':
                        if new_value not in ('0', '1'):
                            print("Invalid value for watering (must be 0 or 1).")
                            return -3
                        water = 'True' if new_value == '1' else 'False'
                    else:
                        print("Invalid system number.")
                        return -3
                    print(f"✅ Updated {date} → {cv};{vent};{water}")
                f.write(f"{date};{cv};{vent};{water}\n")

        if not found:
            print("Date not found.")
            return -1

        return 0

    except FileNotFoundError:
        print("Error: output file not found.")
        return -1


def smart_app_controller():
    """Main menu for the Smart App Controller."""
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
    smart_app_controller()
