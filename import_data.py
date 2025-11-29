import csv
import json
import datetime

def import_data():
    prompts = []
    
    school_map = {
        'elementary': '小学校',
        'junior-high': '中学校',
        'high': '高校'
    }

    try:
        with open('raw_data.tsv', 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f, delimiter='\t')
            
            for row in reader:
                # Map school type
                school_raw = row.get('school', '').strip()
                school_type = school_map.get(school_raw, school_raw) # Default to raw if not found
                
                # Create prompt object
                prompt = {
                    'id': row.get('id', ''),
                    'title': row.get('title', ''),
                    'school_type': school_type,
                    'subject': row.get('subject', ''),
                    'content': row.get('prompt', '').strip('"'), # Remove quotes if present
                    'description': row.get('description', ''),
                    'created_at': datetime.datetime.now().isoformat() # Use current time as we don't have it
                }
                
                prompts.append(prompt)
                
    except FileNotFoundError:
        print("raw_data.tsv not found.")
        return

    # Write to prompts.json
    with open('data/prompts.json', 'w', encoding='utf-8') as f:
        json.dump(prompts, f, indent=4, ensure_ascii=False)
    
    print(f"Successfully imported {len(prompts)} prompts.")

if __name__ == "__main__":
    import_data()
