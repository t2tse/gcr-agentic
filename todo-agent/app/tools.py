import datetime
from zoneinfo import ZoneInfo

def get_current_time() -> dict:
    """Returns the current date and time.
    
    Returns:
        dict: A dictionary containing:
            - current_time: ISO 8601 formatted string of current time.
            - weekday: Name of the current weekday.
            - timezone: The timezone being used (defaulting to system or UTC).
    """
    try:
        # Attempt to get system/local time
        now = datetime.datetime.now().astimezone()
        timezone_name = str(now.tzinfo)
    except Exception:
        # Fallback to UTC if something goes wrong
        now = datetime.datetime.now(ZoneInfo("UTC"))
        timezone_name = "UTC"

    return {
        "current_time": now.isoformat(),
        "weekday": now.strftime("%A"),
        "timezone": timezone_name
    }
